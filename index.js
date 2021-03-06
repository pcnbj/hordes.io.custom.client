const request = require("request");
const puppeteer = require("puppeteer");
const ioHook = require("iohook");
const prompt = require("prompt");
var fs = require("fs");

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
  sortInv(page);
});

//Test Shortcut
const testShortcut = ioHook.registerShortcut(
  [keycodes["Numpad4"]],
  async keys => {
    
  }
);

//Save Settings shortcut
const saveSettings = ioHook.registerShortcut(
  [keycodes["Numpad3"]],
  async keys => {
    console.log("Saving Settings");
    const localStorageData = await page.evaluate(() =>
      Object.assign({}, window.localStorage)
    );
    console.log(localStorageData);
    const settings = JSON.parse(fs.readFileSync("settings.json"));
    settings["Game Settings"] = localStorageData;
    fs.writeFileSync("settings.json", JSON.stringify(settings));
    console.log("Settings Saved");
  }
);

//Exit Shortcut
const exitClient = ioHook.registerShortcut([keycodes["Numpad9"]], keys => {
  exitHandler();
});

//Get character index parameter if not found set it to 1
const characterIndex = process.argv.slice(2) || 1;

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
      args: [`--start-maximized`, "--app=https://hordes.io/"],
      defaultViewport: null
    });
    //Set game settings
    setDomainLocalStorage(browser, "https://hordes.io/play", gameSettings);
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
        } else {
          // get total seconds between the times
          var delta = Math.abs(new Date(expires * 1000) - new Date(Date.now())) / 1000;

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
              hours + ' Hours ' + minutes + ' Minutes'
          );
          //Go to the horders.io login page
          await page.goto("https://hordes.io").then(async () => {
            const playBtn = await page.$(".playbtn");
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

//Function to set localstorage
const setDomainLocalStorage = async (browser, url, values) => {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", r => {
    r.respond({
      status: 200,
      contentType: "text/plain",
      body: "tweak me."
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
const rotation = async page => {
  if (rotationOn) {
    await page.keyboard.type("1");
    console.log("Pressed 1");
  }
};

//Inventory Sort function
const sortInv = async page => {
  console.log("Sorting Inv...");
  const items = [];
  const bagSize = await page.evaluate(
    container => container.childNodes.length,
    await page.$(".slotcontainer")
  );
  for (let i = 0; i < bagSize; i++) {
    const slot = await page.$(`#bag${i} > .icon`);
    if (slot) {
      /* console.log("Slot Exists"); */
      await page
        .hover(`#bag${i}`)
        .then(async () => {
          let item = {};
          await page.waitForSelector(".slotdescription");
          const itemName = await page.evaluate(
            el => el.textContent,
            await page.$(".slotdescription > div > .slottitle")
          );
          /* console.log(itemName); */
          const itemType = await page.evaluate(
            el => el.textContent,
            await page.$(".slotdescription > div > .type")
          );
          /* console.log(itemType); */
          const itemRarity = determineRarity(
            await page.evaluate(el => el.classList, await page.$(`#bag${i}`))
          );
          /* console.log(itemRarity); */
          if (itemType.includes("rune")) {
            const itemReq = await getItemReq();
            const itemPrice = await getItemPrice();
            const itemDesc = await getItemDesc();

            item = {
              name: itemName,
              type: itemType,
              req: itemReq,
              price: itemPrice,
              desc: itemDesc,
              rarity: itemRarity,
              invPos: i
            };
          } else if (itemType.includes("book")) {
            /* console.log("Its a book"); */
            const itemReq = await getItemReq();
            const itemPrice = await getItemPrice();
            const itemSecondary = await getItemSecondary();

            item = {
              name: itemName,
              type: itemType,
              req: itemReq,
              price: itemPrice,
              secondary: itemSecondary,
              rarity: itemRarity,
              invPos: i
            };
          } else if (itemType.includes("armor")) {
            /* console.log("Its armor"); */
            const itemGrade = await page.evaluate(
              el => el.textContent,
              await page.$(".slotdescription > div > .type")
            );
            const itemReq = await getItemReq();
            const itemPrice = await getItemPrice();
            const itemDesc = await getItemDesc();
            item = {
              name: itemName,
              type: itemType,
              grade: itemGrade,
              req: itemReq,
              price: itemPrice,
              desc: itemDesc,
              rarity: itemRarity,
              invPos: i
            };
          } else if (itemType.includes("quiver")) {
            /* console.log("Its a quiver"); */
            const itemGrade = await page.evaluate(
              el => el.textContent,
              await page.$(".slotdescription > div > .type")
            );
            const itemReq = await getItemReq();
            const itemPrice = await getItemPrice();
            const itemDesc = await getItemDesc();
            item = {
              name: itemName,
              type: itemType,
              grade: itemGrade,
              req: itemReq,
              price: itemPrice,
              desc: itemDesc,
              rarity: itemRarity,
              invPos: i
            };
          } else {
            /* console.log("Its a misc"); */
            const itemEffect = await page.evaluate(
              el => el.textContent,
              await page.$(".slotdescription > div > span")
            );
            const itemReq = await getItemReq();
            const itemPrice = await getItemPrice();
            const itemDesc = await getItemDesc();

            item = {
              name: itemName,
              type: itemType,
              effect: itemEffect,
              req: itemReq,
              price: itemPrice,
              desc: itemDesc,
              rarity: itemRarity,
              invPos: i
            };
          }
          items.push(item);
          await page.waitFor(50);
        })
        .catch(err => {
          console.log(err);
        });
    } /* else {
      console.log("Slot does not exist");
    } */
  }
  items.sort((a, b) => {
    if (a.rarity === b.rarity) {
      let x = a.name.toLowerCase(),
        y = b.name.toLowerCase();

      return x < y ? -1 : x > y ? 1 : 0;
    }
    return b.rarity - a.rarity;
  });
  items.reverse();
  items.forEach(async item => {
    try {
      await page.evaluate(
        ({ item, items }) => {
          const slotcontainer = document.querySelector(".slotcontainer");
          prevElement = document.querySelector(`#bag${item.invPos}`);
          slotcontainer.insertBefore(prevElement, slotcontainer.childNodes[0]);
        },
        { item, items }
      );
    } catch (err) {
      console.log(err);
    }
  });
  await page.evaluate(({}) => {
    document.querySelector(".slotcontainer").childNodes.forEach((child, i) => {
      child.id = "bag" + i;
    });
  }, {});
  console.log("Sorting Done!");
};

const getItemReq = async () => {
  return await page.evaluate(
    el => el.textContent,
    await page.$(".slotdescription > div > .requirements")
  );
};

const getItemPrice = async () => {
  return await page.evaluate(
    el => el.textContent,
    await page.$(".slotdescription > div > p > span > span")
  );
};

const getItemDesc = async () => {
  return await page.evaluate(
    el => el.textContent,
    await page.$(".slotdescription > div > .description")
  );
};

const getItemSecondary = async () => {
  return await page.evaluate(
    el => el.textContent,
    await page.$(".slotdescription > div > .textsecondary")
  );
};

const determineRarity = classes => {
  for (let rarity in classes) {
    /* console.log(classes[rarity]); */
    if (classes[rarity] === "white") {
      /* console.log("Common"); */
      return 0;
    } else if (classes[rarity] === "green") {
      /* console.log("Uncommon"); */
      return 1;
    } else if (classes[rarity] === "blue") {
      /* console.log("Rare"); */
      return 2;
    } else if (classes[rarity] === "purple") {
      /* console.log("Epic"); */
      return 3;
    }
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
