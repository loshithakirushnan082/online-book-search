"use strict";

/* ===== Config ===== */
const SEARCH_URL = "https://openlibrary.org/search.json";
const WORK_URL = "https://openlibrary.org";
const COVER_URL = "https://covers.openlibrary.org/b/id";
const PAGE_SIZE = 12;
const FIELDS = "key,title,author_name,first_publish_year,cover_i,subject,number_of_pages_median,language";
const FAV_KEY = "bookfinder_favourites";
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><rect width='100%' height='100%' fill='#e5e7eb'/><text x='50%' y='50%' text-anchor='middle' fill='#9ca3af' font-family='Arial' font-size='18'>No Cover</text></svg>`
  );

/* ===== DOM ===== */
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const typeSelect = document.getElementById("search-type");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const paginationEl = document.getElementById("pagination");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const pageInfo = document.getElementById("page-info");

const tabSearch = document.getElementById("tab-search");
const tabFavs = document.getElementById("tab-favs");
const searchSection = document.getElementById("search-section");
const favsSection = document.getElementById("favs-section");
const favsGrid = document.getElementById("favs-grid");
const favsStatus = document.getElementById("favs-status");
const favCount = document.getElementById("fav-count");

const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

/* ===== State ===== */
let currentQuery = "";
let currentType = "q";
let currentPage = 1;
let totalFound = 0;
let lastResults = []; // books currently displayed in search

/* ===== Favourites (localStorage) ===== */
function getFavs() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY)) || [];
  } catch {
    return [];
  }
}
function saveFavs(favs) {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  favCount.textContent = favs.length;
}
function isFav(key) {
  return getFavs().some((b) => b.key === key);
}
function toggleFav(book) {
  let favs = getFavs();
  if (favs.some((b) => b.key === book.key)) {
    favs = favs.filter((b) => b.key !== book.key);
  } else {
    favs.push(book);
  }
  saveFavs(favs);
}

/* ===== Helpers ===== */
function coverFor(book, size = "M") {
  return book.cover_i ? `${COVER_URL}/${book.cover_i}-${size}.jpg` : PLACEHOLDER;
}
function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function setStatus(el, html, isError = false) {
  el.innerHTML = html;
  el.classList.toggle("error", isError);
}

/* ===== Build a card ===== */
function createCard(book) {
  const card = document.createElement("article");
  card.className = "card";
  const authors = book.author_name ? book.author_name.slice(0, 2).join(", ") : "Unknown author";
  const fav = isFav(book.key);

  card.innerHTML = `
    <img src="${coverFor(book)}" alt="Cover of ${escapeHtml(book.title)}" loading="lazy" />
    <div class="card-body">
      <h3 class="card-title">${escapeHtml(book.title)}</h3>
      <p class="card-author">${escapeHtml(authors)}</p>
      <p class="card-year">${book.first_publish_year ? "First published: " + book.first_publish_year : ""}</p>
      <div class="card-actions">
        <button class="btn-small btn-details" type="button">Details</button>
        <button class="btn-small btn-fav ${fav ? "fav-on" : ""}" type="button">${fav ? "♥ Saved" : "♡ Save"}</button>
      </div>
    </div>`;

  const img = card.querySelector("img");
  img.addEventListener("error", () => (img.src = PLACEHOLDER));
  img.addEventListener("click", () => openDetails(book));
  card.querySelector(".card-title").addEventListener("click", () => openDetails(book));
  card.querySelector(".btn-details").addEventListener("click", () => openDetails(book));

  const favBtn = card.querySelector(".btn-fav");
  favBtn.addEventListener("click", () => {
    toggleFav(book);
    const nowFav = isFav(book.key);
    favBtn.classList.toggle("fav-on", nowFav);
    favBtn.textContent = nowFav ? "♥ Saved" : "♡ Save";
    if (!favsSection.classList.contains("hidden")) renderFavs();
  });

  return card;
}

/* ===== Search ===== */
async function searchBooks(query, type, page) {
  setStatus(statusEl, `<span class="spinner"></span>Searching books...`);
  resultsEl.innerHTML = "";
  paginationEl.classList.add("hidden");

  const params = new URLSearchParams({
    [type]: query,
    page: page,
    limit: PAGE_SIZE,
    fields: FIELDS,
  });

  try {
    const res = await fetch(`${SEARCH_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`Server error (${res.status})`);
    const data = await res.json();

    totalFound = data.numFound || 0;
    lastResults = data.docs || [];

    if (lastResults.length === 0) {
      setStatus(statusEl, `No books found for "<b>${escapeHtml(query)}</b>". Try another keyword.`);
      return;
    }

    setStatus(statusEl, `Found <b>${totalFound.toLocaleString()}</b> books for "<b>${escapeHtml(query)}</b>"`);
    const frag = document.createDocumentFragment();
    lastResults.forEach((b) => frag.appendChild(createCard(b)));
    resultsEl.appendChild(frag);

    updatePagination();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error(err);
    setStatus(
      statusEl,
      "Something went wrong while fetching books. Check your internet connection and try again.",
      true
    );
  }
}

function updatePagination() {
  const totalPages = Math.max(1, Math.ceil(totalFound / PAGE_SIZE));
  pageInfo.textContent = `Page ${currentPage} of ${totalPages.toLocaleString()}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
  paginationEl.classList.remove("hidden");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  currentQuery = q;
  currentType = typeSelect.value;
  currentPage = 1;
  searchBooks(currentQuery, currentType, currentPage);
});

prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    searchBooks(currentQuery, currentType, currentPage);
  }
});
nextBtn.addEventListener("click", () => {
  currentPage++;
  searchBooks(currentQuery, currentType, currentPage);
});

/* ===== Details modal ===== */
async function openDetails(book) {
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  modalBody.innerHTML = `<p><span class="spinner"></span>Loading details...</p>`;

  let description = "No description available.";
  try {
    const res = await fetch(`${WORK_URL}${book.key}.json`);
    if (res.ok) {
      const work = await res.json();
      const d = work.description;
      if (typeof d === "string") description = d;
      else if (d && d.value) description = d.value;
    }
  } catch (err) {
    console.warn("Could not load description", err);
  }

  const authors = book.author_name ? book.author_name.join(", ") : "Unknown";
  const subjects = (book.subject || []).slice(0, 8);
  const langs = (book.language || []).slice(0, 5).join(", ");

  modalBody.innerHTML = `
    <div class="modal-flex">
      <img src="${coverFor(book, "L")}" alt="Cover" />
      <div class="modal-info">
        <h2>${escapeHtml(book.title)}</h2>
        <p><b>Author(s):</b> ${escapeHtml(authors)}</p>
        <p><b>First published:</b> ${book.first_publish_year || "N/A"}</p>
        <p><b>Pages (median):</b> ${book.number_of_pages_median || "N/A"}</p>
        ${langs ? `<p><b>Languages:</b> ${escapeHtml(langs)}</p>` : ""}
        <p><b>Description:</b><br>${escapeHtml(description).slice(0, 900)}</p>
        <div class="tags">${subjects.map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join("")}</div>
        <p style="margin-top:12px">
          <a href="${WORK_URL}${book.key}" target="_blank" rel="noopener">View on Open Library ↗</a>
        </p>
      </div>
    </div>`;
  const img = modalBody.querySelector("img");
  img.addEventListener("error", () => (img.src = PLACEHOLDER));
}

function closeModal() {
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}
modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

/* ===== Favourites view ===== */
function renderFavs() {
  const favs = getFavs();
  favsGrid.innerHTML = "";
  if (favs.length === 0) {
    setStatus(favsStatus, "You have no favourite books yet. Search and click ♡ Save.");
    return;
  }
  setStatus(favsStatus, `${favs.length} saved book(s)`);
  favs.forEach((b) => favsGrid.appendChild(createCard(b)));
}

function showTab(which) {
  const isSearch = which === "search";
  searchSection.classList.toggle("hidden", !isSearch);
  favsSection.classList.toggle("hidden", isSearch);
  tabSearch.classList.toggle("active", isSearch);
  tabFavs.classList.toggle("active", !isSearch);
  if (!isSearch) renderFavs();
}
tabSearch.addEventListener("click", () => showTab("search"));
tabFavs.addEventListener("click", () => showTab("favs"));

/* ===== Init ===== */
favCount.textContent = getFavs().length;
setStatus(statusEl, "Type a book name, author or subject and press Search 🔍");
