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
            item.name = await getItemName(page);
            item.type = await getItemType(page);
            item.rarity = determineRarity(
              await page.evaluate(el => el.classList, await page.$(`#bag${i}`)), page
            );
            if (item.type.includes("rune")) {
              item = {
                ...item,
                req: await getItemReq(page),
                price: await getItemPrice(page),
                desc: await getItemDesc(page),
                invPos: i
              };
            } else if (item.type.includes("book")) {
              /* console.log("Its a book"); */
  
              item = {
                ...item,
                req: await getItemReq(page),
                price: await getItemPrice(page),
                secondary: await getItemSecondary(page),
                invPos: i
              };
            } else if (item.type.includes("armor")) {
              /* console.log("Its armor"); */
  
              item = {
                ...item,
                grade: await getItemGrade(page),
                req: await getItemReq(page),
                price: await getItemPrice(page),
                desc: await getItemDesc(page),
                invPos: i
              };
            } else if (item.type.includes("quiver")) {
              /* console.log("Its a quiver"); */
  
              item = {
                ...item,
                grade: await getItemGrade(page),
                req: await getItemReq(page),
                price: await getItemPrice(page),
                desc: await getItemDesc(page),
                invPos: i
              };
            } else {
              /* console.log("Its a misc"); */
  
              item = {
                ...item,
                effect: await getItemEffect(page),
                req: await getItemReq(page),
                price: await getItemPrice(page),
                desc: await getItemDesc(page),
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
        //Move item
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
    //Change item ids
    await page.evaluate(({}) => {
      document.querySelector(".slotcontainer").childNodes.forEach((child, i) => {
        child.id = "bag" + i;
      });
    }, {});
    console.log("Sorting Done!");
  };

  const getItemName = async (page) => {
    return await page.evaluate(
      el => el.textContent,
      await page.$(".slotdescription > div > .slottitle")
    );
  };
  
  const getItemType = async (page) => {
    return await page.evaluate(
      el => el.textContent,
      await page.$(".slotdescription > div > .type")
    );
  };
  
  const getItemGrade = async (page) => {
    return await page.evaluate(
      el => el.textContent,
      await page.$(".slotdescription > div > .type")
    );
  };
  
  const getItemEffect = async (page) => {
    return await page.evaluate(
      el => el.textContent,
      await page.$(".slotdescription > div > span")
    );
  };
  
  const getItemReq = async (page) => {
    return await page.evaluate(
      el => el.textContent,
      await page.$(".slotdescription > div > .requirements")
    );
  };
  
  const getItemPrice = async (page) => {
    return await page.evaluate(
      el => el.textContent,
      await page.$(".slotdescription > div > p > span > span")
    );
  };
  
  const getItemDesc = async (page) => {
    return await page.evaluate(
      el => el.textContent,
      await page.$(".slotdescription > div > .description")
    );
  };
  
  const getItemSecondary = async (page) => {
    return await page.evaluate(
      el => el.textContent,
      await page.$(".slotdescription > div > .textsecondary")
    );
  };
  
  const determineRarity = (classes, page) => {
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

  const SaveSettings = async(page, fs) => {
    console.log("Saving Settings");
    const localStorageData = await page.evaluate(() =>
      Object.assign({}, window.localStorage)
    );
    const settings = JSON.parse(fs.readFileSync("settings.json"));
    settings["Game Settings"] = localStorageData;
    fs.writeFileSync("settings.json", JSON.stringify(settings));
    console.log("Settings Saved");
  }

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

 exports.sortInv = sortInv;
 exports.SaveSettings = SaveSettings;
 exports.setDomainLocalStorage = setDomainLocalStorage;