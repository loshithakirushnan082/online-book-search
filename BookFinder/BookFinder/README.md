# BookFinder – Online Book Search Application (API)

Modern Web Programming project. Built with HTML5, CSS3 and vanilla JavaScript (ES6+).
Uses the free **Open Library API** – no API key needed.

## Files
- `index.html` – page structure
- `style.css` – styling (responsive)
- `script.js` – API calls, rendering, pagination, favourites, modal

## Run in Visual Studio Code
1. Create a folder `BookFinder` and put all 3 files inside.
2. Open the folder in VS Code (File → Open Folder).
3. Install the **Live Server** extension (Ritwick Dey).
4. Right-click `index.html` → **Open with Live Server**.
   (Or just double-click `index.html` – it also works in the browser.)

## Run in Visual Studio (full IDE)
1. File → Open → Website... → select the folder, or create an
   *ASP.NET Core Empty* project and copy the 3 files into `wwwroot`.
2. Set `index.html` as start page → press **Ctrl + F5**.

## Features
- Search by All / Title / Author / Subject
- Book cover, author, first published year
- Pagination (Prev / Next)
- Details popup with description and subjects
- Favourites saved in browser `localStorage`
- Loading spinner, error handling, empty-result message

## API used
- Search: `https://openlibrary.org/search.json?q=harry+potter`
- Work details: `https://openlibrary.org/works/OLxxxxW.json`
- Cover: `https://covers.openlibrary.org/b/id/{cover_i}-M.jpg`
