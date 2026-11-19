# karthiksreenivasanp.github.io

Personal site at https://www.karthiksreenivasanp.social, built as a macOS-style desktop, dark by default with a light mode.

## Pages

- `index.html`: home. Every window can be closed, minimized into the Dock (genie animation) or zoomed.
- `blog.html`: the public blog and updates, laid out like Notes.
- `editor.html`: where you write posts. Not linked from the site and hidden from search engines.

## Writing a post

There's no database. A post is just files in this repo:

- `posts/index.json`: the list of posts
- `posts/<slug>.json`: one post (title, type, date, HTML)
- `media/<slug>/`: that post's photos and videos

The editor creates these files for you and commits them through the GitHub API.

1. Create a fine-grained token at https://github.com/settings/personal-access-tokens/new
   - Repository access: only this repo
   - Permissions → Repository → Contents: Read and write
   - Pick an expiry date. Make a new token when it runs out.
2. Open `https://www.karthiksreenivasanp.social/editor.html` and paste the token.
3. Write the post, add photos or videos, then click Publish. It goes live in about a minute.

The token is stored only in your browser. Anyone else who opens the editor can't publish without their own token for this repo.

Limits: photos up to 10 MB (big ones are shrunk automatically), videos up to 50 MB. For longer videos, upload to YouTube and paste the link. Keep the whole repo under 1 GB (GitHub Pages limit).

## Libraries

- Quill 2 (BSD-3-Clause), in `vendor/quill`
- DOMPurify 3 (Apache-2.0 / MPL-2.0), in `vendor/dompurify`
