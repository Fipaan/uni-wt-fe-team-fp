"use strict";

// Generic

async function readFile(filename) {
    let result = undefined;
    await fetch(filename, {
            mode: 'cors',
            headers: {
                'Access-Control-Allow-Origin':'*'
            }
        })
        .then((res) => res.text())
        .then((text) => {
            result = text;
         })
        .catch((e) => console.error(e));
    if (result === undefined) throw new Error(`Couldn't read file ${filename}`);
    return result;
}
async function writeFile(filename, content) {
    await fetch("/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({filename, content})
    })
    .then(response => response.text())
    .then(text => console.log(`Successfully wrote file: ${text}`))
    .catch(err => console.error(`Couldn't write file: ${err}`));
}

// Local

async function saveDatabase() {
    await writeFile("database.json", pages);
}
async function loadDatabase() {
    const databaseStr = await readFile("/database.json");
    const database = JSON.parse(databaseStr);
    pages.length = 0;
    for (const page of database) {
        pages.push(page);
    }
}

function initPageRegular(title) {
    return {
        title,
        sectors: [],
        type: TYPES.REGULAR,
    };
}

function initPageWithImage(title, image) {
    return {
        title,
        image,
        sectors: [],
        type: TYPES.WITH_IMAGE,
    };
}

function addSector(page, title, content) {
    const i = page.sectors.length;
    page.sectors.push({title, content, i});
}

function addPage(page) {
    if (getPage(page.title) !== null) throw new Error(`Page ${page.title} already exists!`);
    pages.push(page);
    saveDatabase();
}

const pendingPromises = new WeakMap();

function createPromise() {
    let resolveFn;
    const promise = new Promise((resolve) => {
    resolveFn = resolve;
    });
    pendingPromises.set(promise, resolveFn);
    return promise;
}

function resolvePromise(promise, value) {
    const resolveFn = pendingPromises.get(promise);
    if (resolveFn) {
        resolveFn(value);
        pendingPromises.delete(promise);
    } else {
        throw new Error('Unknown or already resolved promise');
    }
}

// Export

export { pages, getPage, TYPES, ready, stripTitle, restoreTitle, saveDatabase };

const TYPES = Object.freeze({
    REGULAR: "regular",
    WITH_IMAGE: "with_image",
});

const pages = [];

function stripTitle(title) {
    return title 
        .toLowerCase()                  // normalize case
        .trim()                         // remove leading/trailing spaces
        .replace(/[^a-z0-9\-_\s]/g, '') // remove non-url-safe chars
        .replace(/\s+/g, '-')           // replace spaces with hyphens
        .replace(/-+/g, '-');           // collapse multiple hyphens
}
function restoreTitle(stripped) {
    for (const page of pages) {
        if (stripTitle(page.title) === stripped) return page.title;
    }
    return null;
}
function getPage(title) {
    if (title === null) return null;
    for (const page of pages) {
        if (page.title === title) return page;
    }
    return null;
}

const ready = createPromise();

$(document).ready(async () => {
    await loadDatabase();
    resolvePromise(ready, true);
});
