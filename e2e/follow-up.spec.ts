import { expect, test, type Page } from "@playwright/test";

const EXPORT = "engagements.json";
const NEVER_LISTED = ["Priya Shah", "Sarah Quinn", "Amir Khan", "Marcus Bell"];
const NOTE = "Called, sending the evidence checklist";

const importExport = (page: Page) =>
  page.getByLabel("Engagement export file").setInputFiles(EXPORT);

const listedPeople = (page: Page) =>
  page.getByRole("list", { name: "People to follow up" }).getByRole("article");

const card = (page: Page, name: string) => page.getByRole("article", { name });

test("import the export, work the top of the list, and it stays worked", async ({ page }) => {
  const people = listedPeople(page);
  const daniel = card(page, "Daniel Whitmore");

  await test.step("start with nothing imported", async () => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Who is worth a call this month?" }),
    ).toBeVisible();
  });

  await test.step("import the export", async () => {
    await importExport(page);
    await expect(page.getByRole("status")).toContainText("Imported 26 new engagements.");
  });

  await test.step("see the top ten in order, with readable reasons", async () => {
    await expect(people).toHaveCount(10);
    await expect(people.nth(0)).toHaveAccessibleName("Daniel Whitmore");
    await expect(people.nth(1)).toHaveAccessibleName("Grace Mensah");
    await expect(people.nth(2)).toHaveAccessibleName("Thomas Okafor");
    await expect(
      daniel.getByRole("link", { name: "LinkedIn profile of Daniel Whitmore" }),
    ).toHaveAttribute("href", "https://www.linkedin.com/in/daniel-whitmore-fd");
    await expect(daniel).toContainText("Finance Director is one of your target roles");
    await expect(daniel).toContainText("Engaged with 3 different posts in the last 30 days");
  });

  await test.step("see everyone, without colleagues, the account holder or known contacts", async () => {
    await page.getByRole("button", { name: "Show all 11" }).click();
    await expect(people).toHaveCount(11);
    await Promise.all(NEVER_LISTED.map((name) => expect(card(page, name)).toHaveCount(0)));
  });

  await test.step("mark the first person as contacted, with a note", async () => {
    await daniel.getByRole("button", { name: "Mark contacted" }).click();
    await daniel.getByLabel("Note on the contact").fill(NOTE);
    await daniel.getByRole("button", { name: "Save as contacted" }).click();
    await expect(daniel).toHaveCount(0);
    await expect(people.nth(0)).toHaveAccessibleName("Grace Mensah");
  });

  await test.step("they are still gone after a reload", async () => {
    await page.reload();
    await expect(people.nth(0)).toHaveAccessibleName("Grace Mensah");
    await expect(daniel).toHaveCount(0);
  });

  await test.step("they are still gone after the same file is imported again, and nothing is counted twice", async () => {
    await importExport(page);
    await expect(page.getByRole("status")).toContainText("Nothing new in this file.");
    await expect(people.nth(0)).toHaveAccessibleName("Grace Mensah");
    await expect(people.nth(0)).toContainText("9");
    await expect(daniel).toHaveCount(0);
  });

  await test.step("the history shows who was marked and the note", async () => {
    await page.getByRole("link", { name: "History" }).click();
    const row = page.getByRole("row", { name: /Daniel Whitmore/ });
    await expect(row).toContainText("Contacted");
    await expect(row).toContainText(NOTE);
  });
});
