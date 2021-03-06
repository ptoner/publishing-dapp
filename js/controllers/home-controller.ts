import { Dom7, Template7, ModelView, QuillService, PostUIService } from "large-web";
import Core, { Post, ProfileService, ImageService, Profile, FeedMonitorService } from 'large-core';
import { Global } from '../global';

var $$ = Dom7;

class HomeController {

  loadingInProgress: boolean = false
  hasMorePosts: boolean = true

  postsShown: number = 0
  
  limit: number = 20
  lastPost:string = null


  constructor(
    private quillService: QuillService,
    private postUiService:PostUIService,
    private profileService: ProfileService,
    private imageService:ImageService,
    private feedMonitorService:FeedMonitorService
  ) {}

  initializeQuill() {
    this.quillService.buildQuillPostEditor('#create-post-textarea')
  }

  async showTabs() : Promise<ModelView> {
    return new ModelView( async () => {

      return {
        currentAccount: window['currentAccount']
      }

    }, 'pages/tabs.html')
  }


  async showHomePage(): Promise<ModelView> {

    return new ModelView( async () => {

      this.reset()
      this.feedMonitorService.markAllPostsRead()


      let currentUser:Profile

      try {
        currentUser =  await this.profileService.getCurrentUser()
      } catch(ex) {
        console.log(ex)
      }


      return {
        currentAccount: window['currentAccount'],
        profilePicSrc: currentUser && currentUser.profilePic ? await this.imageService.cidToUrl(currentUser.profilePic) : undefined
      }

    }, 'pages/home.html')

    

  }

  async getNextPage() : Promise<Post[]> {

    let posts:Post[] = []

    try {
      await this.postUiService.loadMainFeedForWallet(window['currentAccount'])
      posts = await this.postUiService.getRecentPosts(this.postsShown, this.limit, this.lastPost)
    } catch(ex) {
      console.log(ex)
    }

    
    if (posts.length == this.limit) {
      this.postsShown += posts.length
      this.lastPost = posts[posts.length -1].cid
    } else {
      this.hasMorePosts = false
    }

    return posts

  }


  async loadPostImages() {
    return this.postUiService.loadPostImages()
  }


  async postMessage(e: Event): Promise<void> {

    let content = this.quillService.activeEditor.getContents()
    let length = this.quillService.activeEditor.getLength()

    // return if empty message. quill length is 1 if it's empty
    if (length == 1) return


    //Post to account's post feed
    await this.postUiService.loadPostFeedForWallet(window['currentAccount'])

    let post:Post = await this.postUiService.postMessage(content, window['currentAccount'])


    this.reset()

    
    $$('#post-list').empty()

    //@ts-ignore
    $$('.infinite-scroll-content').trigger('infinite')

    this.quillService.activeEditor.setText('')
    this.quillService.activeEditor.focus()

  }


  async reset() {
    
    this.postsShown = 0
    this.lastPost = undefined
    this.hasMorePosts = true
    
    $$("#post-list").empty()

  }


  async deletePost(e:Event) {

    //Grab the id off the link
    let deleteLink = $$(e.target).parent()
    let id = deleteLink.data('id')

    await this.postUiService.delete(id)

    $$('#post_' + id).remove()

  }




}

export { HomeController }
