import { pages, getPage, TYPES, ready as dbReady, stripTitle, saveDatabase } from '../script.js';

async function urlToBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

$(document).ready(async () => {
    await dbReady;

    // jQuery aliases to elements
    const $title = $('#title');
    const $type = $('#type');
    const $imageGroup = $('#image-group');
    const $image = $('#image');
    const $sectorTitle = $('#sector-title');
    const $sectorContent = $('#sector-content');
    const $addSector = $('#add-sector');
    const $sectorsList = $('#sectors-list');
    const $createPage = $('#create-page');
    const $saveDb = $('#save-db');
    const $clearForm = $('#clear-form');
    const $pagesList = $('#pages-list');
    const $rawDb = $('#raw-db');

    let sectors = [];

    function escapeHtml(s) {
        return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    }

    function renderSectors() {
        $sectorsList.empty();
        sectors.forEach((s, idx) => {
            const $card = $('<div>').addClass('card sector-card');
            const $body = $('<div>').addClass('card-body p-2 d-flex justify-content-between align-items-start');
            const $left = $('<div>');
            $left.append($('<strong>').text(s.title || 'untitled'));
            $left.append($('<div>').addClass('small text-muted').text((s.content || '').slice(0,160)));
            const $right = $('<div>');
            const $btn = $('<button>').addClass('btn btn-sm btn-outline-danger remove-sector').attr('data-idx', idx).text('×');
            $right.append($btn);
            $body.append($left, $right);
            $card.append($body);
            $sectorsList.append($card);
        });

        $sectorsList.find('.remove-sector').off('click').on('click', function() {
            const idx = Number($(this).attr('data-idx'));
            sectors.splice(idx, 1);
            renderSectors();
        });
    }

    function renderPages() {
        $pagesList.empty();
        for (const p of pages) {
            const titleSlug = stripTitle(p.title) || '';
            const $li = $('<li>').addClass('list-group-item d-flex justify-content-between align-items-start');
            const $left = $('<div>');
            $left.append($('<strong>').text(p.title));
            $left.append($('<div>').addClass('small text-muted').text(`${p.type || ''} — ${ (p.sectors||[]).length } sectors`));

            const $group = $('<div>').addClass('btn-group btn-group-sm');
            const $open = $('<a>').addClass('btn btn-outline-secondary').attr('href', `/page?stripped=${encodeURIComponent(titleSlug)}`).attr('target','_blank').text('Open');
            const $json = $('<button>').addClass('btn btn-outline-primary view-json').text('JSON');
            const $delete = $('<button>').addClass('btn btn-outline-danger delete-page').text('Delete');
            $group.append($open, $json, $delete);

            $li.append($left, $group);
            $pagesList.append($li);

            $json.on('click', () => alert(JSON.stringify(p, null, 2)));
            $delete.on('click', () => {
                if (confirm(`Are you sure you want to delete page "${p.title}"?`)) {
                    const idx = pages.indexOf(p);
                    if (idx !== -1) pages.splice(idx, 1);
                    renderPages();
                }
            });
        }
        $rawDb.text(JSON.stringify(pages, null, 2));
    }

    $addSector.on('click', () => {
        const t = $sectorTitle.val().trim();
        const c = $sectorContent.val().trim();
        if (!t && !c) return;
        sectors.push({ title: t || `sector-${sectors.length}`, content: c });
        $sectorTitle.val('');
        $sectorContent.val('');
        renderSectors();
    });

    $type.on('change', () => {
        if ($type.val() === TYPES.WITH_IMAGE) $imageGroup.removeClass('d-none');
        else $imageGroup.addClass('d-none');
    });

    $createPage.on('click', async () => {
        const title = $title.val().trim();
        if (!title) {
            $title.addClass('is-invalid');
            return;
        }
        $title.removeClass('is-invalid');
        if (getPage(title) !== null) {
            alert('Page with this title already exists');
            return;
        }
        const type = $type.val();
        const page = { title, sectors: [...sectors], type };
        if (type === TYPES.WITH_IMAGE) {
            const imgUrl = $image.val().trim();
            if (imgUrl) {
                try {
                    page.image = await urlToBase64(imgUrl);
                } catch (e) {
                    console.error('Failed to fetch/convert image', e);
                    alert('Failed to fetch image — check console');
                    return;
                }
            } else page.image = '';
        }
        pages.push(page);
        // reset form
        $title.val('');
        $image.val('');
        sectors = [];
        renderSectors();
        renderPages();
    });

    $saveDb.on('click', async () => {
        try {
            await saveDatabase();
            alert('database.json saved (server response may be in console)');
        } catch (e) {
            console.error(e);
            alert('Failed to save — check console');
        }
    });

    $clearForm.on('click', () => {
        $title.val('');
        $image.val('');
        sectors = [];
        renderSectors();
    });

    // initial render
    renderPages();
});
