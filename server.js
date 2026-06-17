import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import session from 'express-session';
import methodOverride from 'method-override';
import expressLayouts from 'express-ejs-layouts';
import { SitemapStream, streamToPromise } from 'sitemap';

import siteRoutes from './routes/site.js';
import adminRoutes from './routes/admin.js';
import apiRoutes from './routes/api.js';

import { getViewData } from './helpers/view-data.js';
import { uploadDir } from './helpers/json-db.js';

const app = express();

const PORT = process.env.PORT || 8080;
const isProduction = process.env.NODE_ENV === 'production';

const BASE_URL =
  process.env.BASE_URL || `http://localhost:${PORT}`;

app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));
app.set('layout', 'layouts/main');

app.use(expressLayouts);

app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(methodOverride('_method'));

app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/uploads', express.static(uploadDir));

app.use(
  session({
    name: 'bandartoto.sid',
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(async (req, res, next) => {
  const viewData = await getViewData();

  res.locals.settings = viewData.settings;
  res.locals.slides = viewData.slides;
  res.locals.quickActions = viewData.quickActions;
  res.locals.baseUrl = BASE_URL;
  res.locals.path = req.path;
  res.locals.isAdmin = Boolean(req.session?.isAdmin);

  next();
});

/*
|--------------------------------------------------------------------------
| ROBOTS.TXT
|--------------------------------------------------------------------------
*/

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');

  res.send(`
User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
  `.trim());
});

/*
|--------------------------------------------------------------------------
| SITEMAP.XML
|--------------------------------------------------------------------------
*/

app.get('/sitemap.xml', async (req, res) => {
  try {
    const sitemap = new SitemapStream({
      hostname: BASE_URL
    });

    sitemap.write({
      url: '/',
      changefreq: 'daily',
      priority: 1.0
    });

    sitemap.write({
      url: '/berita',
      changefreq: 'hourly',
      priority: 0.9
    });

    sitemap.write({
      url: '/livescore',
      changefreq: 'always',
      priority: 0.9
    });

    sitemap.write({
      url: '/prediksi-parlay',
      changefreq: 'hourly',
      priority: 0.8
    });

    sitemap.write({
      url: '/kalkulator-odds',
      changefreq: 'weekly',
      priority: 0.7
    });

    /*
    |--------------------------------------------------------------------------
    | JIKA ADA POST BERITA / PREDIKSI
    |--------------------------------------------------------------------------
    */

    const viewData = await getViewData();

    if (Array.isArray(viewData.posts)) {
      for (const post of viewData.posts) {
        sitemap.write({
          url: `/berita/${post.slug}`,
          changefreq: 'daily',
          priority: 0.8
        });
      }
    }

    sitemap.end();

    const xml = await streamToPromise(sitemap);

    res.header('Content-Type', 'application/xml');
    res.send(xml.toString());

  } catch (err) {
    console.error(err);

    res.status(500).send('Sitemap Error');
  }
});

app.use('/admin', adminRoutes);

app.use(apiRoutes);

app.use(siteRoutes);

app.use((req, res) =>
  res.status(404).render('pages/404', {
    pageTitle: '404 • Halaman Tidak Ditemukan',
    pageDescription: 'Halaman tidak ditemukan.',
    activePage: '404',
    styles: ['/assets/css/styles.css'],
    scripts: []
  })
);

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
