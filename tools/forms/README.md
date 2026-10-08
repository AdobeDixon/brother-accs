# AEM Adaptive Forms on the Brother storefront

This runbook covers the Brother Careers job application form
(`/content/forms/af/brother-careers---job-application`, AEM Forms author
`author-p154632-e1630770`) and its embedding on the DA.live page `/careers/apply`.

## Architecture

```
AEM Forms (Universal Editor) ──publish──▶ brother-accs-forms (EDS, repoless)
  /content/forms/af/<form>                 https://main--brother-accs-forms--adobedixon.aem.live
                                           /content/forms/af/<form>
                                                    │  .plain.html (CORS)
                                                    ▼
DA.live  /careers/apply ──▶ brother-accs (EDS storefront) ── Embed Adaptive Form block
                                                    │
                                                    ▼  multipart POST (+ CV attachment)
                                  AEM Forms publish  /adobe/forms/af/submit/<id>
```

* **brother-accs** (existing) stays as is: DA.live content source, Commerce config, same code.
* **brother-accs-forms** (new) is a second repoless site that serves the **same GitHub code**
  (`adobedixon/brother-accs`) but uses AEM author as its content source. Only Adaptive Forms live
  there. Universal Editor opens forms against this site.
* The storefront page embeds the published form with the `embed-adaptive-form` block. The block
  only accepts the current origin and `*--brother-accs-forms--adobedixon.aem.(page|live)`
  (`FORMS_HOSTS` in `blocks/embed-adaptive-form/embed-adaptive-form.js`).
* The form is rendered by Adobe's official `form` block (from
  [adobe-rnd/aem-boilerplate-forms](https://github.com/adobe-rnd/aem-boilerplate-forms), commit
  `7a7b646`). It provides the wizard, rules, validation, file attachments and submission.
* Pages under `/content/forms/af/` (forms site and AEM author) skip Commerce initialisation,
  header and footer (`IS_FORMS_PAGE` in `scripts/scripts.js`). All storefront pages are unchanged.

## Why `/paths.json` returns 404

The storefront uses the EDS Configuration Service, so there is no `fstab.yaml` or `paths.json` in
the repo. With the Configuration Service, path mappings live in the site's **public config**
(`config.json`), and AEM must be told to read them from there by setting the Edge Delivery
Services configuration to **"aem.live with repoless config setup"**. When it is left on the file
based setup, AEM looks for `paths.json` in the code repo and fails with a 404.

AEM reads the mapping from `https://<branch>--brother-accs-forms--adobedixon.aem.live/config.json`.
This repo ships its own `config.json` (the storefront's Commerce settings), and that file is
served on **every** site that uses this code. It shadows the Configuration Service `public`
section, so the mapping is also declared in the repo file as `public.paths`. Commerce reads only
`public.default` and root keys that start with `/`, so the extra key has no effect on the
storefront.

Adding a `paths.json` file to this repo is **not** the fix. Publishing the form into
`brother-accs` would make EDS fetch the form from DA.live, because a site has a single content
source. The form therefore gets its own repoless site, with the mapping held in that site's
config.

References: <https://www.aem.live/developer/repoless-authoring>,
<https://www.aem.live/developer/authoring-path-mapping>,
<https://www.aem.live/docs/custom-headers>.

## Setup steps (require approval, nothing here has been applied)

### 1. Create the forms site in the Configuration Service

`brother-accs-forms.site.json` contains the full site config:

* code: `adobedixon/brother-accs`
* content source: `https://author-p154632-e1630770.adobeaemcloud.com/bin/franklin.delivery/adobedixon/brother-accs-forms/main`
* path mapping: `public.paths` with `mappings: ["/:/"]` and includes for `/content/forms/af/` and
  `/content/dam/formsanddocuments/`
* `access-control-allow-origin: *` on `/content/forms/af/**`, so storefront pages can fetch the
  published form markup. That markup is public anyway.

```sh
curl -X PUT "https://admin.hlx.page/config/adobedixon/sites/brother-accs-forms.json" \
  -H "content-type: application/json" \
  --data @tools/forms/brother-accs-forms.site.json
```

Check it with `https://main--brother-accs-forms--adobedixon.aem.page/config.json`, which must
show the `paths` object.

If AEM's publish technical account isn't already allowed on the org, add it as described in the
repoless authoring guide ("Authentication for publishing").

### 2. Point the form at the forms site (AEM Forms author)

1. Go to **Tools → Cloud Services → Edge Delivery Services Configuration** and select the
   configuration container used by the form (Form properties → Configuration Container).
2. Set **Organization** `adobedixon`, **Site Name** `brother-accs-forms`, **Branch** `main`.
3. Set **Project Type** to **aem.live with repoless config setup** and save.
4. Reopen `brother-careers---job-application` in Universal Editor. It now loads the component
   definitions from this repo (Forms group: Adaptive Form, Wizard, File Attachment, etc.), and the
   paths.json error is gone.

### 3. Publish the form

Use **Publish** in Universal Editor. The form is then available at:

* Preview: `https://main--brother-accs-forms--adobedixon.aem.page/content/forms/af/brother-careers---job-application`
* Live: `https://main--brother-accs-forms--adobedixon.aem.live/content/forms/af/brother-careers---job-application`

### 4. Allow submissions on AEM Forms publish

`blocks/form/constant.js` sends AEM-side submit actions to
`https://publish-p154632-e1630770.adobeaemcloud.com`. On the AEM environment
([Adobe guide](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/edge-delivery/build-forms/universal-editor/publish-forms)):

* **Dispatcher CORS**: trust `https://.*--brother-accs--adobedixon\.aem\.(page|live)`, the
  production storefront domain, and `http://localhost:3000` for development.
* **Referrer filter** (`org.apache.sling.security.impl.ReferrerFilter`): allow the same hosts.
* **Dispatcher filters**: allow `POST` to `/adobe/forms/af/submit/*`.

### 5. Create the `/careers/apply` page in DA.live

Add an **Embed Adaptive Form** block whose single cell links to the published form:

| Embed Adaptive Form |
| --- |
| https://main--brother-accs-forms--adobedixon.aem.live/content/forms/af/brother-careers---job-application |

Preview and publish the page from DA as usual.

### Production domain

If the forms site gets its own production domain, add it to `FORMS_HOSTS` in
`embed-adaptive-form.js`. If the CDN routes `/content/forms/af/*` on the storefront domain to the
forms site, the embed becomes same-origin and needs no CORS.

## Form authoring notes

* Put the **Submit** button inside the last wizard panel. Buttons placed directly in the wizard
  are shown on every step.
* CV uploads are sent as multipart attachments, so use an AEM submit action (email, Power
  Automate, Workfront Fusion, REST endpoint, etc.) rather than the spreadsheet action.
* `blocks/form/rules/index.js` carries a small patch, marked "Brother patch". It makes
  rule-driven *required* fields block wizard step navigation. Keep it when updating the form
  block from upstream.

## Local testing

`drafts/forms/brother-careers-sample.plain.html` is a stand-in form in AEM's published format: a
4-step wizard with conditional and conditionally-required fields, CV upload limited to
PDF/DOC/DOCX up to 5 MB, a consent checkbox and an AEM submit action.
`drafts/careers/apply.plain.html` embeds it.

```sh
aem up --html-folder drafts
# open http://localhost:3000/drafts/careers/apply
```
