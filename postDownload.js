
const getObject = require('./getObject')



const postDownload = async (browserWSEndpoint,url,ctx) => {
    const getPostsArray = (arg) => {
        return arg.map(x=>x.node.video_url ? {media:x.node.video_url,type:"video"} : {media:x.node.display_url,type:"photo"})
    }
    const getSoloPost = (arg) => {
        return arg.video_url ? {media:arg.video_url,type:"video"} : {media:arg.display_url,type:"photo"}
    }
    try{
        const match = /\{"graphql":[{].*\}\)/
        const replace = /<script type="text\/javascript">window._sharedData = |<\/script>|;|\)/gi
        const obj = await getObject(url,match,replace,browserWSEndpoint)
        const posts = obj.graphql.shortcode_media
        const multy = posts.edge_sidecar_to_children;
        const reply = multy ? getPostsArray(multy.edges) : [getSoloPost(posts)];
        try{
            await ctx.replyWithMediaGroup(reply);  
        }catch{
            try{
                await ctx.replyWithVideo({url:reply[0].media})
            }catch{
                ctx.reply('File is too large')
            }
        }
    }catch(error){
        ctx.reply('Wrong post uri')
        console.log(error)
    }
}

module.exports = postDownload
