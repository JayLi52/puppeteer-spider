const puppeteer = require("puppeteer");
const moment = require("moment");
const MusicServer = require("./server/music.js");
const sleep = require('sleep')
require("./mongo.js");

async function init() {
  const browser = await puppeteer.launch({
    timeout: 300000,
    headless: true,
    args: ["--no-sandbox"] //兼容 CentOS 需要
  });

  // 定义数组存储数据
  let musicPlayList = [];
  const page = await browser.newPage();
  for (let i = 0; i < 1191; i += 35) {
    const item = await crawlMusic(page, i);
    await sleep.sleep(1)
    musicPlayList = musicPlayList.concat(item);
  }
  console.log(musicPlayList.length)

  // 保存之前去重
  let hash = {};
  musicPlayList = musicPlayList.reduce((acc, cur) => {
    hash[cur.address] ? "" : (hash[cur.address] = true && acc.push(cur));
    return acc;
  }, []);

  // console.log(musicPlayList.length)
  // 保存到 mongodb 中
  for (let i = 0; i < musicPlayList.length; i++) {
    const item = musicPlayList[i];
    item.date = moment().format("YYYY-MM-DD HH:mm:ss");
    item.show = true;
    MusicServer.save(item);
  }
}

async function crawlMusic(page, pageNumber) {
  let url = `https://music.163.com/#/discover/playlist/?order=hot&cat=%E5%85%A8%E9%83%A8&limit=35&offset=${pageNumber}`;
  // console.log(url);
  // 跳转到歌单页面
  await page.goto(url);
  // 获取歌单的iframe
  let iframe = await page.frames().find(f => f.name() === "contentFrame");
  // 获取歌单
  const result = await iframe.evaluate(() => {
    // 获取所有元素
    const elements = document.querySelectorAll("#m-pl-container > li");
    // 创建数组，存放获取的数据
    let res = [];
    for (let ele of elements) {
      let image = ele.querySelector(".j-flag").getAttribute("src");
      let name = ele.querySelector(".tit").innerText;
      let count = ele.querySelector(".nb").innerText;
      let author = ele.querySelector(".nm").innerText;
      let address =
        "https://music.163.com/#" +
        ele.querySelector(".msk").getAttribute("href");
      const flag = !~count.indexOf("万");
      if (flag) {
        res.push({
          image,
          name,
          count,
          author,
          address,
          from: "netease"
        });
      }
    }
    // 返回数据
    return res;
  });
  return result;
}

init();
