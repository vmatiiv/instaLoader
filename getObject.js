const puppeteer = require('puppeteer')

const getPosts = async (url,match,replace,browserWSEndpoint) =>{
    try{
        const browser = await puppeteer.connect({
          browserWSEndpoint
        })
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (request) => {
          if (request.resourceType() === 'image' || request.resourceType()==='stylesheet') request.abort();
          else request.continue();
        });
        await page.goto(`${url}`)
        const content = await page.content();
        const text = content.match(match).join('').replace(replace,'')

        const obj = JSON.parse(text)
        await page.close();
        await browser.disconnect();
        return obj
    }catch(error){
        throw new Error(error)
    }
}

module.exports = getPosts