const request = require("request");
const puppeteer = require("puppeteer");
const ioHook = require("iohook");
var fs = require("fs");

//Get settings from settings.json
const settings = JSON.parse(fs.readFileSync("settings.json"));
//Read Game Settings
const gameSettings = settings["Game Settings"];
//Read Account Settings
const accountSettings = settings["Account Settings"];
//Read Client Settings
const clientSettings = settings["Client Settings"];

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

let browser;
let page;
let rotationOn = false;

//Set Auto Rotation shortcut
const rotationShortcut = [keycodes["Numpad1"]];

//Console log any key pressed, used to get keycodes
/* ioHook.on('keydown', event => {
  console.log(event);
}); */

//Sort Inventory Shotcut
const sortInventory = ioHook.registerShortcut([keycodes["Numpad2"]], keys => {
  sortInv(page);
});

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

//Start Auto Rotation
const autoRotation = ioHook.registerShortcut(rotationShortcut, keys => {
  rotationOn = !rotationOn;
  if (rotationOn) {
    console.log("Auto Rotation Activated");
  } else {
    console.log("Auto Rotation Deactivated");
  }
});

//Start ioHook
ioHook.start();

//Puppeteer start
(async () => {
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [`--start-maximized`, "--app=https://hordes.io/"],
      defaultViewport: null
    });
    setDomainLocalStorage(browser, "https://hordes.io/play", gameSettings);
    const pages = await browser.pages();
    page = pages[0];
    //await page.setViewport({ width: 1920, height: 1040 });
    await page.goto("https://hordes.io/login");
    //Wait for the play button to appear
    await page.waitForSelector("#identifierId");
    console.log("Page Loaded");
    //Fill in email form
    await page.waitForSelector("#identifierId");
    console.log("Email Input Found");
    await page.focus("#identifierId");
    await page.keyboard.type(accountSettings["email"]);
    await page.keyboard.press("Enter");
    //Fill in password form
    await page.waitForSelector(
      "#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input",
      { visible: true }
    );
    console.log("Password Input Found");
    await page.focus("#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input");
    await page.keyboard.type(accountSettings["password"]);
    await page.keyboard.press("Enter");
    //Select Character
    //Wait for the character to appear
    await page.waitForSelector(".list > div:nth-child(" + characterIndex + ")");
    console.log("Character Found");
    //Click the character
    await page.click(".list > div:nth-child(" + characterIndex + ")");
    //Wait for the enter world button
    await page.waitForSelector(".playbtn");
    //Click the enter world button
    await page.click(".playbtn");
    //Wait for the character ui to appear
    await page.waitForSelector(".actionbarcontainer");
    //Inject new styles
    await page.addStyleTag({ path: "style.css" });
    //Inform player that the game has loaded
    console.log("Actionbar Found, Game Loaded");

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

    //Setinterval with rotation
    setInterval(() => rotation(page), 1000);
  } catch (e) {
    console.log(e);
  }
})();

//Exit handler
const exitHandler = async () => {
  console.log("Exiting");
  browser.close();
  process.exit(0);
};

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
  console.log('Sorting Inv...');
  const items = [];
  for (let i = 0; i < 17; i++) {
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
  items.forEach(async (item, i) => {
    try {
        await page.evaluate(({item, i, items}) => {
          const slotcontainer = document.querySelector('.slotcontainer');
          prevElement = document.querySelector(`#bag${item.invPos}`);
          const id = items.length - i - 1;
          //newElement.id = 'bag' + invPos;
          slotcontainer.insertBefore(prevElement, slotcontainer.childNodes[0]);
          //prevElement.id = 'bag' + id;
          //slotcontainer.insertBefore(newElement, document.querySelector(`#bag${invPos}`));
          /* const $ = window.$;
          $.ajax({
            type: "POST",
            url: "https://hordes.io/api/item/get",
            data: '{ids: [13385549, 12942987]}',
            contentType: "text/plain;charset=UTF-8",
            dataType: "json",
            success: OnSuccess,
            cookie: "sid=s%3AhDxor34wWY9BycGqHhBlA1Y6P_vI36nk.RC%2FEcjdcCyKGkaeSGLyox5PC66C22GYz6tcUh2jMnKs; party=; _ga=GA1.2.1727816761.1576450893; _gid=GA1.2.1547889361.1576450893; _gat=1",
            origin: "https://hordes.io",
            referer: "https://hordes.io/play",
          }) */
          /* slotcontainer.insertBefore(slotcontainer.childNodes[i], prevElement);
          slotcontainer.removeChild(slotcontainer.childNodes[i + 1]);
          slotcontainer.insertBefore(slotcontainer.childNodes[invPos], newElement);
          slotcontainer.removeChild(slotcontainer.childNodes[invPos + 1]); */
        }, {item, i, items})
    } catch (err) {
      console.log(err);
    }
  });
  await page.evaluate(({}) => {
    document.querySelector('.slotcontainer').childNodes.forEach((child, i) => {
      child.id = "bag" + i;
    })
  }, {});
  console.log('Sorting Done!');
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
