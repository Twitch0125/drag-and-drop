import { test, expect, Page } from "@playwright/test";
import { dragDrop } from "../utils";

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await page.goto("http://localhost:5173/");
});

test.describe("Vue wrapper correctly inits parent", async () => {
  test("Init parent by passing in the parent elmeent directly to `dragAndDrop `function.", async () => {
    const listitems = page.locator("#vue_1 .item");
    for (let i = 0; i < (await listitems.count()); i++) {
      await expect(listitems.nth(i)).toHaveAttribute("draggable", "true");
    }
    await dragDrop(page, {
      origin: "#vue_1_10_of_clubs",
      destination: "#vue_1_jack_of_hearts",
      dragStart: true,
      drop: false,
    });
    await expect(page.locator("#vue_1_values")).toHaveText(
      "jack_of_hearts 10_of_clubs queen_of_spades"
    );
    await dragDrop(page, {
      destination: "#vue_1_queen_of_spades",
      dragStart: false,
      drop: true,
    });
    await expect(page.locator("#vue_1_values")).toHaveText(
      "jack_of_hearts queen_of_spades 10_of_clubs"
    );
    await dragDrop(page, {
      origin: "#vue_1_jack_of_hearts",
      destination: "#vue_1_queen_of_spades",
      dragStart: true,
      drop: false,
    });
    await expect(page.locator("#vue_1_values")).toHaveText(
      "queen_of_spades jack_of_hearts 10_of_clubs"
    );
    await dragDrop(page, {
      destination: "#vue_1_10_of_clubs",
      dragStart: false,
      drop: true,
    });
    await expect(page.locator("#vue_1_values")).toHaveText(
      "queen_of_spades 10_of_clubs jack_of_hearts"
    );
  });

  test("init parent by passing in a Vue ref directly to `dragAndDrop` function.", async () => {
    const listitems = page.locator("#vue_2 .item");
    console.log(await listitems);
    for (let i = 0; i < (await listitems.count()); i++) {
      await expect(listitems.nth(i)).toHaveAttribute("draggable", "true");
    }
    await dragDrop(page, {
      origin: "#vue_2_10_of_clubs",
      destination: "#vue_2_jack_of_hearts",
      dragStart: true,
      drop: false,
    });
    await expect(page.locator("#vue_2_values")).toHaveText(
      "jack_of_hearts 10_of_clubs queen_of_spades"
    );
    await dragDrop(page, {
      destination: "#vue_2_queen_of_spades",
      dragStart: false,
      drop: true,
    });
    await expect(page.locator("#vue_2_values")).toHaveText(
      "jack_of_hearts queen_of_spades 10_of_clubs"
    );
    await dragDrop(page, {
      origin: "#vue_2_jack_of_hearts",
      destination: "#vue_2_queen_of_spades",
      dragStart: true,
      drop: false,
    });
    await expect(page.locator("#vue_2_values")).toHaveText(
      "queen_of_spades jack_of_hearts 10_of_clubs"
    );
    await dragDrop(page, {
      destination: "#vue_2_10_of_clubs",
      dragStart: false,
      drop: true,
    });
    await expect(page.locator("#vue_2_values")).toHaveText(
      "queen_of_spades 10_of_clubs jack_of_hearts"
    );
  });

  //test("Touch it", async () => {
  //  const listitems = page.locator("#vue_3 .item");
  //  for (let i = 0; i < (await listitems.count()); i++) {
  //    await expect(listitems.nth(i)).toHaveAttribute("draggable", "true");
  //  }
  //  touchDrop(page, {
  //    origin: "#vue_3_10_of_clubs",
  //    destination: "#vue_3_jack_of_hearts",
  //    touchStart: true,
  //    drop: false,
  //  });
  //  await expect(page.locator("#vue_3_values")).toHaveText(
  //    "jack_of_hearts 10_of_clubs queen_of_spades"
  //  );
  //  await new Promise((r) => setTimeout(r, 10000));

  //  await touchDrop(page, {
  //    destination: "#vue_3_queen_of_spades",
  //    touchStart: false,
  //    drop: true,
  //  });
  //  await expect(page.locator("#vue_3_values")).toHaveText(
  //    "jack_of_hearts queen_of_spades 10_of_clubs"
  //  );
  //  await touchDrop(page, {
  //    origin: "#vue_3_jack_of_hearts",
  //    destination: "#vue_3_queen_of_spades",
  //    touchStart: true,
  //    drop: false,
  //  });
  //  await expect(page.locator("#vue_3_values")).toHaveText(
  //    "queen_of_spades jack_of_hearts 10_of_clubs"
  //  );
  //  await touchDrop(page, {
  //    destination: "#vue_3_10_of_clubs",
  //    touchStart: false,
  //    drop: true,
  //  });
  //  await expect(page.locator("#vue_3_values")).toHaveText(
  //    "queen_of_spades 10_of_clubs jack_of_hearts"
  //  );
  //});
});
