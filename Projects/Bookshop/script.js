// BookBuddy - full script.js
// - Renders ONLY 4 books
// - Pauses 1 second before each ratings API call (prevents 429)
// - Safe handling for missing fields (isbn/author/pages/etc.)
// - Enter key triggers search

const addLoadingSpinner = () => {
  const container = document.getElementById("content");
  if (!container) return;

  // prevent duplicate spinners
  if (document.getElementById("loader")) return;

  const loader = document.createElement("div");
  loader.id = "loader";
  loader.classList.add("loader");
  container.appendChild(loader);
};

const removeLoadingSpinner = () => {
  const loader = document.getElementById("loader");
  if (loader) loader.remove();
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCoverUrl(doc) {
  // Most reliable: cover_i
  if (doc?.cover_i) {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
  }

  // Fallback: isbn if present
  const isbn = Array.isArray(doc?.isbn) ? doc.isbn[0] : null;
  if (isbn) {
    return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
  }

  // No cover
  return "";
}

async function search_book() {
  const searchInput = document.getElementById("searchbar");
  const container = document.getElementById("content");

  if (!searchInput || !container) return;

  const search = searchInput.value.trim().toLowerCase();
  container.innerHTML = "";

  if (!search) {
    container.innerHTML = `<div class="empty">Please type a book name.</div>`;
    return;
  }

  addLoadingSpinner();

  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(search)}`
    );
    if (!res.ok) throw new Error(`Search HTTP ${res.status}`);

    const response = await res.json();
    removeLoadingSpinner();

    const docs = Array.isArray(response?.docs) ? response.docs : [];

    if (!docs.length) {
      container.innerHTML = `<div class="empty">No results found.</div>`;
      return;
    }

    // ✅ Render only first 4 books
    const booksToShow = docs.slice(0, 4);

    // Render all 4 cards first
    for (let i = 0; i < booksToShow.length; i++) {
      const doc = booksToShow[i];

      const title = doc?.title ? String(doc.title) : "Untitled";
      const author =
        Array.isArray(doc?.author_name) && doc.author_name.length
          ? doc.author_name[0]
          : "Unknown";
      const pages =
        doc?.number_of_pages_median !== undefined &&
        doc.number_of_pages_median !== null
          ? doc.number_of_pages_median
          : "Unknown";
      const year =
        doc?.first_publish_year !== undefined && doc.first_publish_year !== null
          ? doc.first_publish_year
          : "Unknown";
      const key = doc?.key ? String(doc.key) : "";

      const coverUrl = getCoverUrl(doc);
      const imgHtml = coverUrl
        ? `<img src="${coverUrl}" alt="Cover for ${title}" onerror="this.style.display='none'"><br>`
        : `<div class="no-cover">No cover available</div>`;

      container.innerHTML += `
        <div class="book">
          <div class="title">${title}</div>
          <div class="info">
            ${imgHtml}
            <div>
              <span style="font-weight:500; color:rgb(122, 72, 15)">Author: </span>${author}<br>
              <span style="font-weight:500; color:rgb(122, 72, 15)">No. of pages: </span>${pages}<br>
              <span style="font-weight:500; color:rgb(122, 72, 15)">First publish year: </span>${year}<br>
              <div class="rating"></div>
              ${
                key
                  ? `<a href="https://openlibrary.org${key}" id="link" target="_blank" rel="noopener noreferrer">Redirect to the book page</a>`
                  : ""
              }
            </div>
          </div>
        </div>
      `;
    }

    // ✅ Fetch ratings with 1 second pause between requests
    for (let i = 0; i < booksToShow.length; i++) {
      const key = booksToShow[i]?.key;
      if (!key) continue;

      await delay(1000); // ⏳ pause 1 second
      rating(key, i);
    }
  } catch (err) {
    removeLoadingSpinner();
    console.error(err);
    container.innerHTML = `<div class="empty">Error fetching books. Please try again.</div>`;
  }
}

// Ratings API call (safe)
function rating(url_spec, book_no) {
  fetch(`https://openlibrary.org${url_spec}/ratings.json`)
    .then((a) => a.json())
    .then((response) => {
      const ratingEls = document.getElementsByClassName("rating");
      const el = ratingEls[book_no];
      if (!el) return;

      // render 5 stars
      el.innerHTML =
        '<span class="material-symbols-outlined star">star</span>'.repeat(5);

      const avg = Number(response?.summary?.average);
      if (!Number.isFinite(avg)) return;

      const filled = Math.max(0, Math.min(5, Math.round(avg)));
      const stars = el.getElementsByClassName("star");

      for (let j = 0; j < filled; j++) {
        stars[j].style.color = "rgb(255, 145, 0)";
      }
    })
    .catch(() => {
      // ignore rating failures silently
    });
}

// Enter key triggers search
document.addEventListener("DOMContentLoaded", () => {
  const sb = document.getElementById("searchbar");
  if (!sb) return;

  sb.addEventListener("keydown", (event) => {
    if (event.key === "Enter") search_book();
  });
});
