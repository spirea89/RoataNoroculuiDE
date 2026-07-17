# Roata Norocului DE

A GitHub Pages friendly German-learning wheel game.

## Pages

- `index.html` - the multiplayer wheel game.
- `config.html` - editor for categories and question text files.

## Content Files

Game content is stored as plain text under `data/`.

- `data/categories.txt` contains one category per line:

```txt
id|Wheel label|Question file
```

- Question files contain one prompt per line:

```txt
Question text|Optional suggested answer
```

Lines starting with `#` are ignored.

## Run Locally

```powershell
node dev-server.cjs
```

Open `http://localhost:5173`.

## Publish With GitHub Pages

In GitHub, open the repository settings, go to **Pages**, choose **Deploy from a branch**, then select `main` and `/root`.
