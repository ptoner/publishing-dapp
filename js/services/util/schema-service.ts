import { Global } from "../../global";
import { Schema } from "../../dto/schema";
import { Post } from "../../dto/post";
import { Friend } from "../../dto/friend";

const OrbitDB = require('orbit-db')
const sha256 = require('js-sha256')

import { timeout } from '../../timeout-promise'

class SchemaService {

    constructor() {}


    async openDocstore(address:string) {

        let docstoreAddress = OrbitDB.parseAddress(address)
        return Global.orbitDb.docstore(docstoreAddress.toString())

    }

    async openFeed(address:string) {

        let feedAddress = OrbitDB.parseAddress(address)
        return Global.orbitDb.feed(feedAddress.toString())

    }

    async openTable(address:string) {

        let feedAddress = OrbitDB.parseAddress(address)

        return Global.orbitDb.open(feedAddress.toString(), {
            type: "table",
        })

    }


    async openCounter(address:string) {
        let feedAddress = OrbitDB.parseAddress(address)
        return Global.orbitDb.counter(feedAddress.toString())
    }


    async getSchema(store) : Promise<Schema> {

        let schema:Schema

        let results = await store.query((e) => e.name === "schema")

        if (results && results[0] && results[0].value) {
            schema = results[0].value
        }

        return schema
    }


    async getSchemaByWalletAddress(walletAddress:string) : Promise<Schema> {
        let mainStore = await this.getMainStoreByWalletAddress(walletAddress)
        let schema:Schema = await this.getSchema(mainStore)

        if (!schema) throw new Error(`Schema for wallet ${walletAddress} could not be found`)

        return schema
    }

    @timeout(2000)
    async getMainStoreByWalletAddress(walletAddress:string) {

        let mainStore

        let mainStoreName = this._getMainStoreNameSeed(walletAddress)

        //get name
        let mainStoreAddress = await Global.orbitDb.determineAddress(mainStoreName, 'docstore', {
            accessController: Global.orbitAccessControl //This might cause issues in the future. Do we need to
        })

        //Try to open it
        mainStore = await Global.orbitDb.open(mainStoreAddress)
        await mainStore.load()

        return mainStore

    }


    async getProfileStoreByWalletAddress(walletAddress: string) {
        let schema:Schema = await this.getSchemaByWalletAddress(walletAddress)
        return this.openDocstore(schema.profileStore)
    }


    async getPostFeedByWalletAddress(walletAddress: string) {
        let schema:Schema = await this.getSchemaByWalletAddress(walletAddress)
        return this.openFeed(schema.postFeed)
    }

    async getFriendFeedByWalletAddress(walletAddress: string) {
        let schema:Schema = await this.getSchemaByWalletAddress(walletAddress)
        return this.openFeed(schema.friendFeed)
    }


    async getRepliesPostFeed(post:Post, translatedContent: string) {

        let repliesFeedName = this._getRepliesFeedNameSeed(post, translatedContent)

        let repliesFeed = await Global.orbitDb.feed(repliesFeedName, {
            accessController: Global.orbitAccessControl
          })

        return repliesFeed

    }

    async getRepliesPostFeedAddress(post:Post, translatedContent: string) : Promise<string> {
        let feed = await this.getRepliesPostFeed(post, translatedContent)

        let address: string = feed.address.toString()

        return address
    }



    getOrbitAddress(orbitCid:string, walletAddress:string) : string {
        return `/orbitdb/${orbitCid}/mainStore-${walletAddress.toLowerCase()}`
    }



    private _getMainStoreNameSeed(walletAddress:string ): string  {
        return `mainStore-${walletAddress.toLowerCase()}`
    }

    private _getProfileStoreNameSeed(walletAddress:string ): string  {
        return `profile-${walletAddress.toLowerCase()}`
    }

    private _getPostFeedNameSeed(walletAddress:string ) : string {
        return `post-${walletAddress.toLowerCase()}`
    }

    private _getFriendFeedNameSeed(walletAddress:string ) : string {
        return `friend-${walletAddress.toLowerCase()}`
    }

    private _getPostFeedCounterNameSeed(walletAddress:string ) : string {
        return `post-counter-${walletAddress.toLowerCase()}`
    }

    private _getRepliesFeedNameSeed(post:Post, translatedContent: string) : string {
        let hash = sha256(`${post.owner}-${post.dateCreated}-${translatedContent}`)

        return `post-${hash}`
    }



    async generateMainStore(orbit, accessController, walletAddress:string) {

        let mainStoreName = this._getMainStoreNameSeed(walletAddress)

        return Global.orbitDb.docstore(mainStoreName, {
            indexBy: "_id",
            accessController: accessController
        })
    }

    async generateSchema(orbitdb, accessController, mainStore, walletAddress:string) {

        console.log('Generating schema')

        let profileStore = await this.generateProfileStore(orbitdb, accessController, walletAddress)
        let postFeed = await this.generatePostFeed(orbitdb, accessController, walletAddress)
        let friendFeed = await this.generateFriendFeed(orbitdb, accessController, walletAddress)

        let schema:Schema = {
          profileStore: profileStore.address.toString(),
          postFeed: postFeed.address.toString(),
          friendFeed: friendFeed.address.toString()
        }

        await mainStore.put({
          _id: walletAddress,
          name: "schema",
          value: schema
        })

        console.log('Inserted schema into mainStore')

    }


    async updateSchema(mainStore, schema:Schema, walletAddress:string) {

        //Make sure schema has all fields
        let schemaUpdated:boolean = false

        if (!schema.profileStore) {
            let profileStore = await this.generateProfileStore(Global.orbitDb, Global.orbitAccessControl, walletAddress)
            schema.profileStore = profileStore.address.toString()
            schemaUpdated = true
        }

        if (!schema.postFeed) {
            let postFeed = await this.generatePostFeed(Global.orbitDb, Global.orbitAccessControl, walletAddress)
            schema.postFeed = postFeed.address.toString()
            schemaUpdated = true
        }

        if (!schema.friendFeed) {
            let friendFeed = await this.generateFriendFeed(Global.orbitDb, Global.orbitAccessControl, walletAddress)
            schema.friendFeed = friendFeed.address.toString()
            schemaUpdated = true
        }


        if (schemaUpdated) {

            console.log("Updating schema")

            await mainStore.put({
                name: "schema",
                value: schema
            })
        }

    }


    async generateProfileStore(orbitdb, accessController, walletAddress:string) {

        console.log("Generating profile store")

        //Create profile store
        let profileStoreName = this._getProfileStoreNameSeed(walletAddress)

        return orbitdb.docstore(profileStoreName, {
          create: true,
          indexBy: '_id',
          accessController: accessController
        })

    }




    async generatePostFeed(orbitdb, accessController, walletAddress:string) {

        console.log("Generating post feed")

        let postFeedName = this._getPostFeedNameSeed(walletAddress)

        return orbitdb.feed(postFeedName, {
          create: true,
          accessController: accessController
        })

    }



    async generateFriendFeed(orbitdb, accessController, walletAddress:string) {

        console.log("Generating friend feed")

        let friendFeedName = this._getFriendFeedNameSeed(walletAddress)

        return orbitdb.feed(friendFeedName, {
            create: true,
            accessController: accessController
        })

    }


}


export {
    SchemaService
}
