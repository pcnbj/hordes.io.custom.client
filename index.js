const request = require("request");
const puppeteer = require("puppeteer");
const ioHook = require("iohook");
const prompt = require("prompt");
const ownFuncs = require("./ownFunctions");
var fs = require("fs");

//Todo
//Make shift click item functionalitty on all items.
//Make inventory sorting faster
//Make skill cd show in seconds and miliseconds.

("use strict");

let browser;
let page;
let rotationOn = false;

//Start prompt
prompt.start();

//Check if settings file exists
if (fs.existsSync("./settings.json")) {
  console.log("Settings Exist");
} else {
  //Create clean settings
  const settings = JSON.stringify({
    "Game Settings": {},
    "Client Settings": {},
    Cookies: {}
  });
  //Write the settings to a new settings.json file
  fs.writeFileSync("settings.json", settings, "utf8");
}

//Get settings from settings.json
const settings = JSON.parse(fs.readFileSync("settings.json"));
//Read Game Settings
const gameSettings = settings["Game Settings"];
//Read Client Settings
const clientSettings = settings["Client Settings"];
//Read Cookies
const cookies = settings["Cookies"];
//Get Skills from skills.json
const skills = JSON.parse(fs.readFileSync("skills.json"));

//Map keynames to keycodes NOTE: Add more keys
const keycodes = {
  Numpad1: 61007,
  Numpad2: 61008,
  Numpad3: 61009,
  Numpad4: 61003,
  Numpad5: 61004,
  Numpad6: 61005,
  Numpad7: 60999,
  Numpad8: 61000,
  Numpad9: 61001
};

//Set Auto Rotation shortcut
const rotationShortcut = [keycodes["Numpad1"]];

//Exit handler
const exitHandler = () => {
  console.log("Exiting");
  if (browser) {
    browser.close();
  }
  process.exit(0);
};

//Sort Inventory Shotcut
const sortInventory = ioHook.registerShortcut([keycodes["Numpad2"]], keys => {
  ownFuncs.sortInv(page);
});

//Test Shortcut
const testShortcut = ioHook.registerShortcut(
  [keycodes["Numpad4"]],
  async keys => {
    await getBarInfo().then((result) => {
      console.log(result);
    })
  }
);

//Save Settings shortcut
const saveSettings = ioHook.registerShortcut(
  [keycodes["Numpad3"]],
  async keys => {
    ownFuncs.SaveSettings(page, fs);
  }
);

//Exit Shortcut
const exitClient = ioHook.registerShortcut([keycodes["Numpad9"]], keys => {
  exitHandler();
});

//Get character index parameter if not found set it to 1
const characterIndex = process.argv.slice(2, 3) || 1;

if (!/([1-5])/.test(characterIndex)) {
  console.log("Error the specified character index is invalid");
  exitHandler();
}

console.log("Character " + characterIndex + " Selected");

//Start Auto Rotation
const autoRotation = ioHook.registerShortcut(rotationShortcut, keys => {
  rotationOn = !rotationOn;
  if (rotationOn) {
    console.log("Auto Rotation Activated");
  } else {
    console.log("Auto Rotation Deactivated");
  }
});

//Puppeteer start
const clientRun = async () => {
  try {
    //Launch Puppeteer
    browser = await puppeteer.launch({
      headless: false,
      args: [`--start-maximized`, "--app=https://hordes.io/", '--no-sandbox'],
      defaultViewport: null
    });
    //Set game settings
    ownFuncs.setDomainLocalStorage(browser, "https://hordes.io/play", gameSettings);
    //Define the page into a variable
    const pages = await browser.pages();
    page = pages[0];
    //Get Cookies
    if (cookies["Empty"]) {
      console.log("Cookies empty you have 30 Seconds to login.");
      //Go to the horders.io login page
      await page.goto("https://hordes.io/login");
      //Wait for the characters to appear to save cookies
      await page
        .waitForSelector(".list > div:nth-child(" + characterIndex + ")")
        .then(async () => {
          await saveCookies().then(async () => {
            //Select Character
            //Wait for the character to appear
            await page.waitForSelector(
              ".list > div:nth-child(" + characterIndex + ")"
            );
            console.log("Character Found");
            //Click the character
            await page.click(".list > div:nth-child(" + characterIndex + ")");
            //Wait for the enter world button
            await page.waitForSelector(".playbtn");
            //Click the enter world button
            await page.click(".playbtn");
          });
        })
        .catch(err => {
          console.log("Login time exceeded exiting...");
          console.log(err);
          exitHandler();
        });
    } else {
      await page.setCookie(...cookies).then(async () => {
        console.log("Cookies Loaded");
        const expires = cookies[2].expires;
        if (new Date(Date.now()) > new Date(expires * 1000)) {
          console.log("Session expired relog needed");
          //Go to the horders.io login page
          await page.goto("https://hordes.io/login").then(async () => {
            await saveCookies().then(async () => {
              //Select Character
              //Wait for the character to appear
              await page.waitForSelector(
                ".list > div:nth-child(" + characterIndex + ")"
              );
              console.log("Character Found");
              //Click the character
              await page.click(".list > div:nth-child(" + characterIndex + ")");
              //Wait for the enter world button
              await page.waitForSelector(".playbtn");
              //Click the enter world button
              await page.click(".playbtn");
            });
          });
        } else {
          // get total seconds between the times
          var delta =
            Math.abs(new Date(expires * 1000) - new Date(Date.now())) / 1000;

          // calculate (and subtract) whole days
          var days = Math.floor(delta / 86400);
          delta -= days * 86400;

          // calculate (and subtract) whole hours
          var hours = Math.floor(delta / 3600) % 24;
          delta -= hours * 3600;

          // calculate (and subtract) whole minutes
          var minutes = Math.floor(delta / 60) % 60;
          delta -= minutes * 60;

          // what's left is seconds
          var seconds = delta % 60;
          console.log(
            "Session expires in: " +
              days +
              " Days " +
              hours +
              " Hours " +
              minutes +
              " Minutes"
          );
          //Go to the horders.io login page
          await page.goto("https://hordes.io").then(async () => {
            //Select Character
            //Wait for the character to appear
            await page.waitForSelector(
              ".list > div:nth-child(" + characterIndex + ")"
            );
            console.log("Character Found");
            //Click the character
            await page.click(".list > div:nth-child(" + characterIndex + ")");
            //Wait for the enter world button
            await page.waitForSelector(".playbtn");
            //Click the enter world button
            await page.click(".playbtn");
          });
        }
      });
    }
    /* const Cookies = await page.cookies();
    console.log(JSON.stringify(Cookies)); */
    //Wait for the character ui to appear
    await page.waitForSelector(".actionbarcontainer");
    //Inject new styles
    await page.addStyleTag({ path: "style.css" });
    //Inject client functions
    await page.addScriptTag({ path: "clientInject.js" });
    //Inform player that the game has loaded
    console.log("Actionbar Found");

    //Change UI
    await page.evaluate(() => {
      //Add 'EXP: ' spans before the exp displays
      const exp = document.createElement("span");
      exp.innerHTML = "EXP: ";
      exp.className = "exp-label-1";
      document.querySelector("#expbar > div > .progressBar").appendChild(exp);
      const exp2 = document.createElement("span");
      exp2.innerHTML = "EXP: ";
      exp2.className = "exp-label-2";
      document.querySelector("#expbar > div > .progressBar").appendChild(exp2);
      //Add Auction House Functionallity
      document.body.addEventListener('click', (event) => {
        console.log(event.target.className);
        if(event.target.className.includes('item')) {
          console.log(event.target);
          if(event.shiftKey) {
            console.log('Shift Cliked An Auction Element');
            searchItem(event.target);
          }
        }
      })
    });

    //Inform player that game is ready
    console.log("Everything loaded, Enjoy");
    console.log(`Key shortcuts: 
      Numpad1: Auto Rotation,
      Numpad2: Sort Inventory,
      Numpad3: Save Settings,
      Numpad9: Exit
    `);

    //Setinterval with rotation
    setInterval(() => rotation(page), 1000);
  } catch (e) {
    console.log(e);
  }
};

clientRun();

//Console log any key pressed, used to get keycodes
/* ioHook.on('keydown', event => {
  console.log(event);
}); */

//Start ioHook
ioHook.start();

//Rotation function
const rotation = async page => {
  if (rotationOn) {
    await page.keyboard.type("1");
    console.log("Pressed 1");
  }
};

const saveCookies = async () => {
  const settings = JSON.parse(fs.readFileSync("settings.json"));
  settings["Cookies"] = await page.cookies();
  fs.writeFileSync("settings.json", JSON.stringify(settings));
  console.log(
    "Cookies Saved session expires: " +
      new Date(settings["Cookies"][2].expires * 1000)
  );
};

const getBarInfo = async () => {
  const skillBar = [];
  await page.evaluate(({skills, skillBar}) => {
    console.log(skills);
    document.querySelector("#skillbar").childNodes.forEach(async (child, i) => {
      const icon = document.querySelector(`#sk${i} > img`);
      if(icon) {
        console.log('Slot is filled');
        const skillId = icon.getAttribute('src').slice(18).split('.')[0];
        console.log(skillId);
        const skill = skills.find(skill => skill.ID === Number(skillId));
        console.log(skill);
        skillBar.push(skill);
      }
    });
    console.log(skillBar);
  }, {skills, skillBar});
  console.log(skillBar);
  return skillBar
}
