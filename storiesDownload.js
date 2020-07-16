const getObject = require('./getObject');


const storiesDownload = async (browserWSEndpoint,url,ctx) => {
    const getStoriesArray = (arg) => {
        const n = 10; // max media file number for 1 message
        const arr = arg.map(item => item.is_video ? {media:item.video_resources[item.video_resources.length-1].src.replace(/amp/gi,''),type:"video"}: {media:item.display_url.replace(/amp/gi,''),type:"photo"});
        return arr.reduce((r, e, i) =>
            (i % n ? r[r.length - 1].push(e) : r.push([e])) && r
        , []);
    }
  try{
        const match = /<pre style="word-wrap: break-word; white-space: pre-wrap;">.*<\/pre>/gi
        const replace = /<pre style="word-wrap: break-word; white-space: pre-wrap;">|<\/pre>|;/gi 

        const obj = await getObject(url,match,replace,browserWSEndpoint)
        const stories = obj.data.reels_media[0].items;
        const reply = getStoriesArray(stories);
        reply.forEach(async element => {
            await ctx.replyWithMediaGroup(element);
        });
    }catch(error){
        ctx.reply('User doesn`t have stories');
        console.log(error);
    }
}

module.exports = storiesDownload