const request = require("request");
const puppeteer = require("puppeteer");
const ioHook = require('iohook');
const prompt = require('prompt');
var fs = require("fs");
var download = function(uri, filename, callback) {
  request.head(uri, function(err, res, body) {
    console.log("content-type:", res.headers["content-type"]);
    console.log("content-length:", res.headers["content-length"]);
    request(uri)
      .pipe(fs.createWriteStream(filename))
      .on("close", callback);
  });
};

//Start prompt
prompt.start()

//Get settings from settings.json
const settings = JSON.parse(fs.readFileSync('settings.json'));
//Read Game Settings
let gameSettings = settings['Game Settings'];
//Read Account Settings
let accountSettings = settings['Account Settings'];
//Read Client Settings
let clientSettings = settings['Client Settings'];

const characterIndex = Number(process.argv.slice(2));

console.log(characterIndex);

//Puppeteer start
const clientRun = (async () => {
  try {
    //Launch Puppeteer
    browser = await puppeteer.launch({ headless: false, args: [`--start-maximized`, '--app=https://hordes.io/'], defaultViewport: null });
    //Set game settings
    setDomainLocalStorage(browser, 'https://hordes.io/play', gameSettings);
    //Define the page into a variable
    const pages = await browser.pages();
    page = pages[0];
    //Go to the horders.io login page
    await page.goto("https://hordes.io/login");
    //Wait for the email field to appear
    await page.waitForSelector("#identifierId");
    console.log("Page Loaded");
    //Fill in email form
    await page.waitForSelector("#identifierId");
    console.log("Email Input Found");
    await page.focus("#identifierId");
    await page.keyboard.type(accountSettings['email']);
    await page.keyboard.press("Enter");
    //Fill in password form
    await page.waitForSelector(
      "#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input",
      { visible: true }
    );
    console.log("Password Input Found");
    await page.focus("#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input");
    await page.keyboard.type(accountSettings['password']);
    await page.keyboard.press("Enter");
    //Select Character
    //Wait for the character to appear
    await page.waitForSelector(
      "#hero > div.row.slim.svelte-ocydj6 > div > div > div > div.list.svelte-15hmaii > div:nth-child(" + characterIndex + ")"
    );
    console.log("Character Found");
    //Click the character
    await page.click(
      "#hero > div.row.slim.svelte-ocydj6 > div > div > div > div.list.svelte-15hmaii > div:nth-child(" + characterIndex + ")"
    );
    //Wait for the enter world button
    await page.waitForSelector(
      "#hero > div.row.slim.svelte-ocydj6 > div > div > div > div.btn.playbtn.primary.svelte-15hmaii"
    );
    //Click the enter world button
    await page.click(
      "#hero > div.row.slim.svelte-ocydj6 > div > div > div > div.btn.playbtn.primary.svelte-15hmaii"
    );
    //Wait for the character ui to appear
    await page.waitForSelector(
      "body > div.l-ui.layout.svelte-16x821t > div.container.combat.svelte-16x821t > div.uiscaled > div"
    );
    //Inject new styles
    await page.addStyleTag({ path: "style.css" });
    await page.waitForSelector(
      "#ufplayer > div.panel-black.bars.targetable.svelte-1rrmvqb > div:nth-child(1) > div.progressBar.bghealth.svelte-kl29tr"
    );
    //Inform player that the game has loaded
    console.log("Actionbar Found, Game Loaded");

    //Change UI
    await page.evaluate(() => {
        //Add 'EXP: ' spans before the exp displays 
        const exp = document.createElement('span');
        exp.innerHTML = 'EXP: ';
        exp.className = 'exp-label-1'
        document.querySelector("#expbar > div > div.progressBar.bgexp.svelte-kl29tr").appendChild(exp);
        const exp2 = document.createElement('span');
        exp2.innerHTML = 'EXP: ';
        exp2.className = 'exp-label-2'
        document.querySelector("#expbar > div > div.progressBar.bgexp.svelte-kl29tr").appendChild(exp2);
    })

    //Setinterval with rotation
    setInterval(() => rotation(page), 1000);
    
  } catch (e) {
    console.log(e);
  }
});

if(accountSettings.email === '' || accountSettings.password === '') {
  prompt.get(['email', 'password'], (err, result) => {
    if(err) {
      console.log('Error please try again');
    }
    settings['Account Settings'] = {
      email: result.email,
      password: result.password
    }
    fs.writeFileSync('settings.json', JSON.stringify(settings));
    accountSettings = settings['Account Settings'];
    console.log('Account information received and saved');
    clientRun();
  })
} else {
  clientRun();
}

//Map keynames to keycodes NOTE: Add more keys
const keycodes = {
  Numpad1: 3663,
  Numpad2: 57424,
  Numpad3: 3665,
  Numpad4: 57419,
  Numpad5: 57420,
  Numpad6: 57421,
  Numpad7: 3665,
  Numpad8: 57416,
  Numpad9: 3657
}

let browser;
let page;
let rotationOn = false;

//Set Auto Rotation shortcut
const rotationShortcut = [keycodes['Numpad1']];

//Console log any key pressed, used to get keycodes
/* ioHook.on('keydown', event => {
  console.log(event);
}); */

//Exit Shortcut
const exitClient = ioHook.registerShortcut([keycodes['Numpad9']], (keys) => {
  exitHandler();
});

//Save Settings shortcut
const saveSettings = ioHook.registerShortcut([keycodes['Numpad3']], async(keys) => {
  console.log('Saving Settings');
  const localStorageData = await page.evaluate(() =>  Object.assign({}, window.localStorage));
  console.log(localStorageData);
  const settings = JSON.parse(fs.readFileSync('settings.json'));
  settings['Game Settings'] = localStorageData;
  fs.writeFileSync('settings.json', JSON.stringify(settings));
  console.log('Settings Saved');
});

//Start Auto Rotation
const autoRotation = ioHook.registerShortcut(rotationShortcut, (keys) => {
  rotationOn = !rotationOn;
  if(rotationOn) {
    console.log('Auto Rotation Activated');
  } else {
    console.log('Auto Rotation Deactivated');
  }
});

//Start ioHook
ioHook.start();

//Exit handler
const exitHandler = async() => {
  console.log('Exiting');
  browser.close();
  process.exit(0);
}

//Function to set localstorage
const setDomainLocalStorage = async (browser, url, values) => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', r => {
      r.respond({
        status: 200,
        contentType: 'text/plain',
        body: 'tweak me.',
      });
    });
    await page.goto(url);
    await page.evaluate(values => {
      for (const key in values) {
        localStorage.setItem(key, values[key]);
      }
    }, values);
    await page.close();
  };

//Rotation function
const rotation = async(page) => {
  if(rotationOn) {
    await page.keyboard.type('1');
    console.log('Pressed 1');
  }
}

