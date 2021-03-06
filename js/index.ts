import { Global } from "./global"
import { FollowController } from "./controllers/follow-controller"

import Core from 'large-core'
import Web, { Template7, Framework7, Dom7, ModelViewService } from 'large-web'

import { UiService } from "./services/ui-service"

import routes from "./routes"

const moment = require('moment')
var $$ = Dom7;







module.exports = async function () {

  /** Shortcut methods for localStorage access */
  Storage.prototype.setObject = function (key, value) {
    this.setItem(key, JSON.stringify(value));
  }

  Storage.prototype.getObject = function (key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
  }


  //Template7 helpers

  Template7.registerHelper('shortDate', function (date) {
    return moment(date).format('MMM D, YYYY')
  })


  //Global templates. Figure out a better place to do this. Leaving here for now because it needs to happen
  //before templates start getting rendered.

  let profileResult = `
    <li>
      <div class="item-content" id="profile_{{_id}}">
        <div class="item-media">
          <a href="/profile/static/{{_id}}">
            {{#if profilePic}}
              <img class="profile-pic-thumb" src="{{profilePicSrc}}">
            {{else}}
              <i class="f7-icons profile-pic-thumb">person</i>
            {{/if}}
          </a>
        </div>
        <div class="item-inner">
          <div class="item-title-row">
            <div class="item-title">
              <a href="/profile/static/{{_id}}">
                <span class="post-owner-display">{{name}}</span> 
                <div class="post-owner">{{_id}}</div>
              </a>
            </div>
            <div class="item-after">
                {{#if following}}
                  <a class="button button-round button-fill button-small unfollow-link" data-id="{{_id}}" >Following</a>
                {{else}}
                  <a class="button button-round button-outline button-small follow-link" data-id="{{_id}}" >Follow</a>
                {{/if}}
            </div>
          </div>
          <div class="item-subtitle">{{aboutMe}}</div>
        </div>
      </div>
    </li>

  `


  let postResult = `
    <li class="post">
      <a href="/post/show/{{cid}}" class="item-link">
        <div class="item-content" id="post_{{cid}}">
          <div class="item-media">
            {{#if ownerProfilePic}}
              <img class="profile-pic-thumb" src="{{ownerProfilePicSrc}}">
            {{else}}
              <i class="f7-icons profile-pic-thumb">person</i>
            {{/if}}
          </div>
          <div class="item-inner">
            <div class="item-title-row">
              <div class="item-title">
                <span class="post-owner-display">{{ownerDisplayName}}</span>
                <span class="post-owner">{{owner}}</span>
              </div>
              <div class="item-after">
                {{dateCreated}}
              </div>
            </div>
            <div class="item-subtitle post-content">{{contentTranslated}}</div>
          </div>
        </div>
      </a>
    </li>
  `

  let homeTab = `
    <a href="/" class="tab-link tab-link-active">
      <i class="icon f7-icons if-not-md">home 
          <span class='badge color-red new-message-badge {{js_if "this.unreadPosts == 0"}}hide{{/if}}'>
            {{unreadPosts}}
          </span>
      </i>
      <span>Home</span>
    </a>
  `


  Global.profileResultTemplate = Template7.compile(profileResult)
  Global.postResultTemplate = Template7.compile(postResult)

  Template7.registerPartial("postResult", postResult)
  Template7.registerPartial("profileResult", profileResult)
  Template7.registerPartial("homeTab", homeTab)




  //Detect page root
  // @ts-ignore
  const rootUrl = new URL(window.location)


  // Framework7 App main instance
  Global.app = new Framework7({
    root: '#app', // App root element
    id: 'large', // App bundle ID
    name: 'Large', // App name
    theme: 'aurora', // Automatic theme detection

    // App routes
    routes: routes(rootUrl.pathname)

  })
  

  try {
    await Global.init()
  } catch(ex) {
    console.log(ex)
  }
  
  Global.uiService = new UiService(Global.app)
  Global.initializeControllers()
 






  // Init/Create main view
  const mainView = Global.app.views.create('.view-main', {
    pushState: true
  })


  window['Global'] = Global;


  //Register global click listeners. Probably move somewhere else at some point.
  $$(document).on('click', '.follow-link', async function (e) {
    let controller: FollowController = window['followController']
    await controller.followClick(e)
  })


  $$(document).on('click', '.unfollow-link', async function (e) {
    let controller: FollowController = window['followController']
    await controller.unfollowClick(e)
  })

}
