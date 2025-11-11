"use strict";

import * as db from "../script.js";

function base64ToBlob(data) {
    const [header, base64] = data.split(",");
    if (!base64) {
        throw new Error("Invalid data URL");
    }
    const mime = header.match(/:(.*?);/)[1];
    if (!mime) {
        throw new Error("Invalid MIME type in data URL");
    }
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
}

const params = new URLSearchParams(window.location.search);
function getRequire(param) {
    const result = params.get(param);
    if (result === null) throw new Error(`Unknown parameter: ${param}`);
    return result;
}

function $inPlace(elem) {
    return $($.parseHTML(elem.trim()));
}

const $IMG_TEMPLATE = $inPlace(`
<div class="col-md-4 text-md-end">
    <img alt="Topic Image" class="img-fluid rounded float-end ms-3 mb-2 pageImage">
</div>
`);
const $HEADER_TEMPLATE = $inPlace(`
<header class="container text-center mt-5 flex-grow-1">
    <div class="row align-items-center">
        <div class="col-md-8 text-start">
            <h1 class="display-5 fw-bold title">Title</h1>
        </div>
    </div>
</header>
`);
const $SECTOR_TEMPLATE = $inPlace(`
<section id="intro" class="sector">
    <h2 class="title">Title</h2>
    <p class="content">Content</p>
</section>
`);
const $REGULAR_TEMPLATE = $inPlace(`
<main class="container mt-4 ms-6" id="page">
</main>
`);
const $NAV_LI_TEMPLATE = $inPlace(`
<li class="nav-item">
    <a class="nav-link text-white" href="#">
        Item
    </a>
</li>
`);

function prepareNav(page, $elem) {
    const $pageList = $(".pageList").first();
    for (let i = 0; i < page.sectors.length; ++i) {
        const sector = page.sectors[i];
        const id = `${sector.title}Sector`;
        const $sector = $SECTOR_TEMPLATE.clone()
                            .attr("id", id);
        $sector.find(".title").first().text(sector.title);
        $sector.find(".content").first().text(sector.content);
        $elem.append($sector);

        const $li = $NAV_LI_TEMPLATE.clone(true);
        $li.find("a").first()
           .text(sector.title)
           .attr("href", `#${id}`);
        $pageList.append($li);
    }
}

function createPageRegular(page) {
    const $elem = $REGULAR_TEMPLATE.clone();
    const $header = $HEADER_TEMPLATE.clone()
              .find(".title").first()
              .text(page.title);

    $elem.append($header);
    prepareNav(page, $elem);
    return $elem;
}
function test(base64img) {
  return fetch(base64img).then(r => { if (!r.ok) throw r; return r.blob(); });
}
function createPageWithImage(page) {
    const $elem = $REGULAR_TEMPLATE.clone();
    const $header = $HEADER_TEMPLATE.clone()
            .find(".title").first()
            .text(page.title);
    
    const blob = base64ToBlob(page.image);
    const url = URL.createObjectURL(blob);
    const $img = $IMG_TEMPLATE.clone().find("img").first()
            .attr("alt", `${page.title} Image`)
            .attr('src', url);
    console.log($img);
    $header.append($img);

    $elem.append($header);
    prepareNav(page, $elem);
    return $elem;
}

function createPage(page) {
    switch (page.type) {
        case db.TYPES.REGULAR:    return createPageRegular(page);
        case db.TYPES.WITH_IMAGE: return createPageWithImage(page);
        default: throw new Error(`unknown type: ${page.type}`);
    }
}

function parseCSSTime(timeStr) {
    if (typeof timeStr !== "string") return NaN;
    
    timeStr = timeStr.trim().toLowerCase();

    const match = timeStr.match(/^([\d.]+)(ms|s)?$/);
    if (!match) return NaN;

    const value = parseFloat(match[1]);
    const unit = match[2] || "ms";

    if (unit === "s") return value * 1000;
    if (unit === "ms") return value;
    
    return NaN;
}

function prepareSidebar() {
    const $btn = $(".sticky-sidebar-btn");
    const $sidebar = $("#sidebar");
    const $html = $(document.documentElement);

    let isActive = false;
    const onToggle = () => {
        const sidebarWidth = parseInt($html.css("--sidebar-width").trim());
        const fadeTime = parseCSSTime($html.css("--fade-time").trim());

        isActive = !isActive;
        $sidebar.animate({
            "margin-left": isActive ? "0px" : `-${sidebarWidth}px`
        }, fadeTime);
        $('.shifting').animate({
            "margin-left": isActive ? `${sidebarWidth}px` : "0px"
        }, {
            duration: fadeTime,
            queue: false,
        });
        $('#page').animate({
            "margin-left": isActive ? `${sidebarWidth}px` : "70px"
        }, fadeTime);
        if (isActive) $btn.fadeOut(fadeTime)
        else $btn.fadeIn(fadeTime);
    }
    $("#sidebarToggle").on("click", () => {
        onToggle();
    });
    // $NAV_LI_TEMPLATE.on("click", onToggle);
    $NAV_LI_TEMPLATE.on("click", function (e) {
        const target = $(this).find("a").attr("href");
        if (target && target.startsWith("#")) {
            e.preventDefault();
    
            onToggle();
    
            const $target = $(target);
            if ($target.length) {
                const fadeTime = parseCSSTime($html.css("--fade-time").trim());
                setTimeout(() => {
                    $("html, body").animate({
                        scrollTop: $target.offset().top
                    }, fadeTime * 1.5);
                }, fadeTime);
            }
        }
    });

    const positionStickyBtn = () => {
        const header = document.querySelector(".site-header");
        let offset = 10;
        if (header) {
            const rect = header.getBoundingClientRect();
            if (rect.bottom > 0) {
                offset = Math.ceil(rect.bottom) + 10;
            }
        }
        $btn[0].style.top = offset + "px";
    };
 
    // initial position and on resize (header height can change on responsive breakpoints)
    positionStickyBtn();
    $(window).on("resize orientationchange scroll", positionStickyBtn);
}

$(document).ready(async () => {
    prepareSidebar();

    await db.ready;
    const title = db.restoreTitle(getRequire("stripped"));
    const page  = db.getPage(title);
    if (page === null) throw new Error(`Unknown page: ${title}`);
    $("#title").text(title);
    $("#page").replaceWith(createPage(page));
});
