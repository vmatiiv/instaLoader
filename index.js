const puppeteer = require('puppeteer');

const { Telegraf } = require('telegraf')
const Markup = require('telegraf/markup')
const Extra = require('telegraf/extra')
const logIn = require('./login');
const session = require('telegraf/session')

const storiesDownload = require('./storiesDownload')
const postDownload = require('./postDownload');
const getObject = require('./getObject');
const getProfilePhoto = require('./getProfilePhoto')
const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session())



const express = require('express');
const expressApp = express();

const port = process.env.PORT || 3000;
expressApp.get('/', (req, res) => {
  res.send('Hello World!')
});
expressApp.listen(port, () => {
  console.log(`Listening on port ${port}`)
});



 



( async () => {

    let browser = await puppeteer.launch({
      headless:true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const browserWSEndpoint = browser.wsEndpoint();
    await logIn(browser);
    browser.disconnect();


    

    bot.start(async ( ctx) =>{
      ctx.reply('Just send username with @ like @thisisbillgates. Or send link to profile, igtv,stories which you want to download');
      ctx.session.users=[]
      ctx.session.userPosts=[]


    });


    bot.action(/stories.*/,async (ctx) => {
      const userId = ctx.callbackQuery.data.split(' ')[1];
      const url =`https://www.instagram.com/graphql/query/?query_hash=0a85e6ea60a4c99edc58ab2f3d17cfdf&variables={"reel_ids":["${userId}"],"tag_names":[],"location_ids":[],"highlight_reel_ids":[],"precomposed_overlay":false,"show_story_viewer_list":true,"story_viewer_fetch_count":50,"story_viewer_cursor":"","stories_video_dash_manifest":false}`
      await storiesDownload(browserWSEndpoint,url,ctx)
  })

  bot.action(/highlights.*/,async ctx=>{
      const userId = ctx.callbackQuery.data.split(' ')[1];
      const message = ctx.callbackQuery.message.text.split(' ');
      const username = message[message.length-1]
      const url = `https://www.instagram.com/graphql/query/?query_hash=d4d88dc1500312af6f937f7b804c68c3&variables={"user_id":"${userId}","include_chaining":false,"include_reel":false,"include_suggested_users":false,"include_logged_out_extras":false,"include_highlight_reels":true,"include_live_status":true}`
      const match = /<pre style="word-wrap: break-word; white-space: pre-wrap;">.*<\/pre>/gi
      const replace = /<pre style="word-wrap: break-word; white-space: pre-wrap;">|<\/pre>|;/gi 
      try{
      const highlightsList = (await getObject(url,match,replace,browserWSEndpoint)).data.user.edge_highlight_reels.edges;
      await ctx.reply(`${username} has ${highlightsList.length} ${highlightsList.length === 1 ? 'highlight collection' : 'highlight collections'}`,
      Extra.markup(m=>{
          const buttons = [];
          highlightsList.forEach(({node}) => {
            buttons.push([m.callbackButton(`${node.title}`, `highlightCB ${node.id}`)]) 
          })
          return m.inlineKeyboard([...buttons])
      }))
    }catch{
      ctx.reply('User doesn`t have stories')
    }
    })
    bot.action(/highlightCB.*/,async ctx=>{
      const id = ctx.callbackQuery.data.split(' ')[1];
      const url = `https://www.instagram.com/graphql/query/?query_hash=0a85e6ea60a4c99edc58ab2f3d17cfdf&variables={"reel_ids":[],"tag_names":[],"location_ids":[],"highlight_reel_ids":["${id}"],"precomposed_overlay":false,"show_story_viewer_list":true,"story_viewer_fetch_count":50,"story_viewer_cursor":"","stories_video_dash_manifest":false}`
      return await storiesDownload(browserWSEndpoint,url,ctx)
    })
    const highlights = /https?:\/\/(www\.instagram\.com)?(.*highlights*.)/
    bot.hears(highlights, async ctx=>{
      const id = ctx.message.text.match(/\d/gi).join('');
    
      const url = `https://www.instagram.com/graphql/query/?query_hash=0a85e6ea60a4c99edc58ab2f3d17cfdf&variables={"reel_ids":[],"tag_names":[],"location_ids":[],"highlight_reel_ids":["${id}"],"precomposed_overlay":false,"show_story_viewer_list":true,"story_viewer_fetch_count":50,"story_viewer_cursor":"","stories_video_dash_manifest":false}`
      await storiesDownload(browserWSEndpoint,url,ctx)
    })

    const post = /https?:\/\/(www\.instagram\.com(\/p|\/tv)).*/
    bot.hears(post,async ctx=>{
        const url = ctx.message.text.trim();
        await postDownload(browserWSEndpoint,url,ctx)

    })






    bot.action('posts',async ctx => {
      try{
        if(!ctx.session.userPosts){
          ctx.session.userPosts=[]
        }
        const resMessage = ctx.callbackQuery.message.text.split(' ');
        const user = resMessage[resMessage.length-1];
        const url = `https://instagram.com/${user}`
        const match = /<script type="text\/javascript">window._sharedData = .*<\/script>/
        const replace = /<script type="text\/javascript">window._sharedData = |<\/script>|;/gi

        const content = (await getObject(url,match,replace,browserWSEndpoint)).entry_data.ProfilePage[0]
        const obj = content.graphql.user.edge_owner_to_timeline_media;
        const {count,edges} = obj;
        const hasNextPage = obj.page_info.has_next_page;
        const endCursor = obj.page_info.end_cursor;
        const id = content.graphql.user.id;

        ctx.session.userPosts.push({id:id,endCursor:endCursor});
        await ctx.reply(`@${user} has ${count} posts`
        ,Extra.markup(m =>{
          const buttons = [];
          edges.forEach(({node}) => {
            buttons.push([m.callbackButton(`${new Date(node.taken_at_timestamp*1000).toLocaleDateString()}`, `${node.shortcode}`)]) 
          })
          return m.inlineKeyboard([...buttons,[m.callbackButton(`next`,`next ${id}`,!hasNextPage)]])
        }))
     

      return bot.on('callback_query',async ctx=>{
        const data = ctx.update.callback_query.data.split(' ');
        const action = data[0];
        const id = data[1]
        const message = ctx.update.callback_query.message.text;
        const current = ctx.session.userPosts.find(x => x.id == id)
        const match = /<pre style="word-wrap: break-word; white-space: pre-wrap;">.*<\/pre>/gi
        const replace = /<pre style="word-wrap: break-word; white-space: pre-wrap;">|<\/pre>|;/gi 

        try{
          if(action==='next'){
            if(!current.endCursor) return 
            const url = `https://www.instagram.com/graphql/query/?query_id=17888483320059182&variables={"id":"${id}","first":12,"after":"${current.endCursor}"}`
            const obj= (await getObject(url,match,replace,browserWSEndpoint)).data.user.edge_owner_to_timeline_media;
            const {edges:media} = obj;
            const {has_next_page:hasNextPage,end_cursor:endCursor} = obj.page_info;
            current.endCursor = endCursor;

            return await ctx.editMessageText(message,
              Extra.markup(m => {
                const buttons = [];
                media.forEach(({node}) => {
                  buttons.push([m.callbackButton(`${new Date(node.taken_at_timestamp*1000).toLocaleDateString()}`, `${node.shortcode}`)]) 
                })
                return m.inlineKeyboard([...buttons,[m.callbackButton(`next`,`next ${id}`,!hasNextPage),m.callbackButton('Back ',`prev ${id}`,hasNextPage)]])
            }))
          } 
          if(action=="prev"){
            const url = `https://www.instagram.com/graphql/query/?query_id=17888483320059182&variables={"id":"${id}","first":12,"before":"${endCursor}"}`
            const {edges:media} = (await getObject(url,match,replace,browserWSEndpoint)).data.user.edge_owner_to_timeline_media;
            current.endCursor = endCursor
            return await ctx.editMessageText(message,
              Extra.markup(m => {
                const buttons = [];
                media.forEach(({node}) => {
                  buttons.push([m.callbackButton(`${new Date(node.taken_at_timestamp*1000).toLocaleDateString()}`, `${node.shortcode}`)]) 
                })
                return m.inlineKeyboard([...buttons,[m.callbackButton(`next`,`next ${id}`)]])
            }))
          }

          const url = `https://instagram.com/p/${data}`;
          return await postDownload(browserWSEndpoint,url,ctx);
        }catch(error){console.log(error)}
      })
      }catch{await ctx.reply('User doesn`t have posts')}
    }) 

    bot.action('remove',async ctx => {
      const message = ctx.callbackQuery.message.text.split(' ');
      const username = '@' + message[message.length-1];
      try{
        ctx.session.users.splice(ctx.session.users.indexOf(username),1)
        await ctx.editMessageText(ctx.callbackQuery.message.text,Extra.markup((m) =>{
          return m.inlineKeyboard([
            [
              m.callbackButton(`Stories ${username}`, 'stories'),
              m.callbackButton(`Highlights ${username}`, 'highlights')
            ],
            [m.callbackButton(`Posts ${username}`,'posts')],
            [m.callbackButton(`Add ${username} to favorite`,'favorite')]
          ]) 
        }));
      await ctx.reply(username + ' removed',ctx.session.users.length ? Markup.keyboard(ctx.session.users).resize().extra() : Markup.removeKeyboard(true).extra()) 
      }catch{
        return await ctx.reply('nothing to delete')
      }


    })
    bot.action('favorite',async (ctx) => {
      const message = ctx.callbackQuery.message.text.split(' ');
      const username = '@' + message[message.length-1];
      try{
      ctx.session.users.push(username)
      await ctx.editMessageText(ctx.callbackQuery.message.text,        Extra.markup((m) =>{
        return m.inlineKeyboard([
          [
            m.callbackButton(`Stories ${username}`, 'stories'),
            m.callbackButton(`Highlights ${username}`, 'highlights')
          ],
          [m.callbackButton(`Posts ${username}`,'posts')],
          [m.callbackButton(`Remove ${username} from favorite`,'remove') ]
        ]) 
      }));
      await ctx.reply(username +' added', Markup.keyboard(ctx.session.users).resize().extra() )
      }catch{
        return await ctx.reply('Some error. Try later')
      }
    })










    const username = /(?:^|\W)@(\w+)(?!\w)/
    bot.hears(username, async (ctx) => {
        if(!ctx.session.users){
          ctx.session.users=[];
        }
        const username = `${ctx.message.text.slice(1,ctx.message.text.length)}`;    

        try{
            const {private,id} = await getProfilePhoto(browserWSEndpoint,username,ctx);
            if ( private ) return await ctx.reply('private profile')
            return await ctx.reply('chose option for '+username,
            Extra.markup((m) =>{
              return m.inlineKeyboard([
                [
                  m.callbackButton(`Stories @${username}`, `stories ${id}`),
                  m.callbackButton(`Highlights @${username}`, `highlights ${id}`)
                ],
                [m.callbackButton(`Posts @${username}`,'posts')],
                [!ctx.session.users.includes('@'+username) ? m.callbackButton(`Add @${username} to favorite`,'favorite') : m.callbackButton(`Remove @${username} from favorite`,'remove') ]
              ]) 
            })
          );
        }catch{
          return ctx.reply('wrong username');

        }
    });



})();

bot.launch() 