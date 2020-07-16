const puppeteer = require('puppeteer');
const getObject = require('./getObject');

const profilePhoto = async  (browserWSEndpoint,username,ctx) => {
  const match = /<script type="text\/javascript">window._sharedData = .*<\/script>/
  const replace = /<script type="text\/javascript">window._sharedData = |<\/script>|;/gi
  const url = `https://instagram.com/${username}`;
  const obj = (await getObject(url,match,replace,browserWSEndpoint)).entry_data.ProfilePage[0].graphql.user; 
  const biography = obj.biography
  const img = obj.profile_pic_url_hd

  if(!img){
    throw new Error();
  }
  await ctx.replyWithPhoto(img);

  if(biography){
    await ctx.reply(biography);
  }
  return {
    private: obj.is_private,
    id: obj.id
  }

}
module.exports = profilePhoto