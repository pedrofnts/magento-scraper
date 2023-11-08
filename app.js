const puppeteer = require("puppeteer");
const fs = require("fs");
const Papa = require("papaparse");

const categories = [
  "beleza",
  "saude",
  "mulher",
  "emagrecimento",
  "desempenho-fisico",
  "oficialderma",
  "arago-dermocosmeticos",
  "linha-casa",
  "homem",
];

let csvData = [];

// Função para raspar dados de uma categoria
const scrapeCategory = async (browser, category) => {
  let pageIndex = 1;
  let page = await browser.newPage();
  let hasData = true;

  while (hasData) {
    const url = `https://www.oficialfarma.com.br/${category}?p=${pageIndex}&product_list_limit=36`;
    console.log(`Acessando ${url}`);

    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector(".product-item-info, .message.info.empty");

    const data = await page.evaluate(() => {
      if (document.querySelector(".message.info.empty")) {
        return { products: [], lastPage: true };
      }

      const items = Array.from(document.querySelectorAll(".product-item-info"));
      return {
        products: items.map((item) => ({
          name: item.querySelector(".product-item-link")?.innerText.trim(),
          imageUrl: item.querySelector(".product-image-photo")?.src,
          price: item
            .querySelector(
              ".price-box .price-final_price .price-wrapper .price"
            )
            ?.innerText.trim(),
          oldPrice: item
            .querySelector(".price-box .old-price .price-wrapper .price")
            ?.innerText.trim(),
          description: item
            .querySelector(".short_description")
            ?.innerText.trim(),
          productLink: item.querySelector(".product-item-link")?.href,
        })),
        lastPage: false,
      };
    });

    if (data.lastPage) {
      console.log(
        `Categoria: ${category} - Fim das páginas após a página ${pageIndex}`
      );
      hasData = false;
    } else {
      console.log(
        `Categoria: ${category} - Página ${pageIndex} raspada com ${data.products.length} produtos.`
      );
      csvData = csvData.concat(data.products);
      pageIndex++;
    }
  }

  await page.close();
};

const saveToCSV = (data) => {
  const csv = Papa.unparse(data);
  fs.writeFileSync("products.csv", csv);
  console.log("Dados salvos em products.csv");
};

(async () => {
  const browser = await puppeteer.launch();
  for (const category of categories) {
    console.log(`Iniciando scraping da categoria: ${category}`);
    await scrapeCategory(browser, category);
  }
  await browser.close();

  saveToCSV(csvData);
})();
