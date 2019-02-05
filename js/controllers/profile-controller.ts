import { ModelView } from '../model-view'
import {ProfileService} from "../services/profile-service";
import {UploadService} from "../services/upload-service";
import {PostService} from "../services/post-service";
import {Global} from "../global";
import {Dom7} from "framework7";

var $$ = Dom7


class ProfileController {

    loadingInProgress: boolean = false

    constructor(
      private profileService : ProfileService,
      private uploadService : UploadService,
      private postService : PostService) {
        const self = this

        $$(document).on('submit', '#edit-profile-form', function(e) {
            self.profileEditSave(e)
        });
        $$(document).on('submit', '#create-profile-form', function(e) {
            self.profileCreateSave(e)
        });

        $$(document).on('infinite', '#static-profile-infinite-scroll', async function(e) {

          // Exit, if loading in progress
          if (self.loadingInProgress) return;

          self.loadingInProgress = true

          await self.loadStaticProfilePosts(e)

          self.loadingInProgress = false

        })
    }

    async showCreateProfile() : Promise<ModelView> {
      return new ModelView({},  'pages/profile/create.html')
    }

    async showStaticProfile(id: Number) : Promise<ModelView> {

        let profile: Profile = await this.profileService.getProfileById(id)

        //Show the edit button if this is their profile
        let currentUser: Profile

        try {
          currentUser = await this.profileService.getCurrentUser()
        } catch(ex) {
          console.log("Profile doesn't exist");
        }

        let model = {
          profile: profile,
          showEditLink: (currentUser && currentUser.id == profile.id)
        }

        return new ModelView(model, 'pages/profile/static.html')

    }

    async showProfile() : Promise<ModelView> {

        let profile: Profile;

        try {
          profile = await this.profileService.getCurrentUser()
        } catch(ex) {
          console.log("Profile doesn't exist")
        }

        if (profile) {
          Global.app.methods.navigate(`/profile/static/${profile.id}`)
        } else {
          return new ModelView({}, 'pages/profile/no_profile.html')
        }

    }

    async showProfileEdit() : Promise<ModelView> {

        let profile: Profile = await this.profileService.getCurrentUser()

        return new ModelView(profile, 'pages/profile/edit.html')

    }

    async profileEditSave(e: Event): Promise<void> {

        e.preventDefault();

        //Collect info
        var profileData: Profile = Global.app.form.convertToData('#edit-profile-form');

        //Add photo (if selected)
        profileData = await this.addProfilePic(profileData)


        //Update
        await this.profileService.updateProfile(profileData)

        //Redirect
        Global.app.methods.navigate("/profile/show");
    }


    async profileCreateSave(e: Event) : Promise<void> {

        e.preventDefault();

        //Collect info
        let profileData: Profile = Global.app.form.convertToData('#create-profile-form');

        //Save
        try {

          //Add photo (if selected)
          profileData = await this.addProfilePic(profileData)


          await this.profileService.createProfile(profileData)

          //Redirect
          Global.app.methods.navigate("/profile/show")

        } catch(ex) {
          Global.app.methods.showExceptionPopup(ex)
        }

    }




    async loadStaticProfilePosts(e: Event) : Promise<void> {

      let owner = $$('#static-profile-owner').val()

      let currentPosts = $$('#static-profile-post-list').children('li').length

      this.postService.loadMorePosts(
        await this.postService.getPostsByOwner(owner, 10, currentPosts),
        await this.postService.getPostByOwnerCount(owner),
        '#static-profile-post-list'
      )

    }



  /**
   * UTIL
   */


    async addProfilePic(profileData: Profile) : Promise<Profile> {

        //Upload photo if we have it
        const profilePic: HTMLElement = document.getElementById("profilePic");

        //@ts-ignore
        if ((profilePic).files.length > 0) {
          profileData.profilePic = <string> await this.uploadService.uploadFile(profilePic)
        }

        return profileData

    }


}



export { ProfileController }
