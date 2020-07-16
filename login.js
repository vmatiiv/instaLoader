require('dotenv').config();
const logIn = async(browser) => {
    const page =  await browser.newPage();
    await page.goto('https://www.instagram.com/accounts/login/?source=auth_switcher');
    await page.waitFor(()=>document.querySelectorAll('input').length);
    await page.type('[name=username]',`${process.env.LOGIN}`)    
    await page.type('[name=password]',`${process.env.PASSWORD}`)
    await page.click('button.sqdOP[type="submit"]')
    .then(() => page.waitForNavigation({waitUntil: 'load'}));
    console.log('logged in');
    await page.close();
}

module.exports = logIn