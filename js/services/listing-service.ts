import { SchemaService } from "./util/schema-service";
import { WhitepagesService } from "./whitepages-service";
import { Listing } from "../dto/listing";
import { Schema } from "../dto/schema";
import { Global } from "../global";
import { Profile } from "../dto/profile";
import { ProfileService } from "./profile-service";

class ListingService {
    
    
    constructor(
        private schemaService: SchemaService,
        private whitepageService: WhitepagesService
    ) {

    }


    async getListings(limit:number, offset:number) {

        let listings:Listing[] = await this.whitepageService.readList(limit, offset)

        //Remove myself
        listings.forEach( async (listing, index) => {
          if (window['currentAccount'].toLowerCase() == listing.owner.toLowerCase()) {
                listings.splice(index,1);
            }
        })

        return listings

    }

    async getPostFeed(listing:Listing) {
        let schema:Schema = await this._getSchema(listing)
        return this._getPostFeed(schema)
    }

    async getProfileStore(listing:Listing) {
        let schema:Schema = await this._getSchema(listing)
        return this._getProfileStore(schema)
    }


    async getProfile(listing:Listing) : Promise<Profile> {
        
        let profileStore = await this.getProfileStore(listing)

        let listingProfileService = new ProfileService(profileStore)

        return listingProfileService.read(listing.owner)

    }

    async getProfiles(listings:Listing[]) : Promise<Profile[]> {

        let profiles:Profile[] = []

        for (var listing of listings) { 
            profiles.push(await this.getProfile(listing))
        }

        return profiles
    }


    async getListingProfiles(limit, offset) : Promise<Profile[]> {
        let listings:Listing[] = await this.getListings(limit, offset)
        return this.getProfiles(listings)
    }


    private async _getMainStore(listing:Listing) {
        let orbitAddress = this._getOrbitAddress(listing)
        return this.schemaService.loadMainStore(orbitAddress)
    }

    private async _getSchema(listing: Listing) {
        let friendMainStore = await this._getMainStore(listing)
        return this.schemaService.getSchema(friendMainStore)
    }

    private async _getPostFeed(schema:Schema) {
        return this.schemaService.loadPostFeed(schema.postFeed, Global.orbitAccessControl)
    }

    private async _getProfileStore(schema:Schema) {
        return this.schemaService.loadProfileStore(schema.profileStore, Global.orbitAccessControl)
    }




    private _getOrbitAddress(listing:Listing) : string {
        return `/orbitdb/${listing.orbitCid}/mainStore-${listing.owner.toLowerCase()}`
    }



}

export {
    ListingService
}