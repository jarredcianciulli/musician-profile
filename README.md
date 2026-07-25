# Music Academy Website

A modern, responsive website for a music teaching academy built with React, TypeScript, and Tailwind CSS.

## Features

- 🎹 **Multiple Instruments**: Piano, Guitar, Violin, Drums, Vocal, and Music Theory
- 📱 **Fully Responsive**: Beautiful on all devices - mobile, tablet, and desktop
- 🎨 **Modern Design**: Clean, professional interface with smooth animations
- ⚡ **Fast Performance**: Optimized for speed and user experience
- 🔍 **SEO Friendly**: Proper meta tags and semantic HTML

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **React Router** - Navigation
- **Google Fonts** - Inter & Playfair Display

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository or navigate to the project directory
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` directory.

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Navbar.tsx      # Navigation bar
│   ├── Footer.tsx      # Footer with links and contact info
│   ├── Hero.tsx        # Hero section with CTA
│   ├── Lessons.tsx     # Lessons grid display
│   ├── About.tsx       # About section with stats
│   ├── Testimonials.tsx # Student testimonials
│   └── Contact.tsx     # Contact form and info
├── pages/              # Page components
│   └── Home.tsx        # Main landing page
├── App.tsx             # Root component with routing
├── index.tsx           # Entry point
└── index.css           # Global styles and Tailwind imports
```

## Customization

### Colors

Edit `tailwind.config.js` to change the color scheme:

```javascript
colors: {
  primary: {
    // Your custom colors here
  }
}
```

### Content

All content is in the component files in `src/components/`. Edit these files to update:

- Lesson offerings
- Testimonials
- Contact information
- Hero section text

### Fonts

Update fonts in `src/index.css`:

```css
@import url("https://fonts.googleapis.com/css2?family=YourFont&display=swap");
```

Then add to `tailwind.config.js`:

```javascript
fontFamily: {
  sans: ['YourFont', 'sans-serif'],
}
```

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# Upload the build directory to Netlify
```

### GitHub Pages

```bash
npm install --save-dev gh-pages
# Add to package.json scripts:
# "deploy": "gh-pages -d build"
npm run build
npm run deploy
```

## Contributing

Feel free to submit issues, fork the repository, and create pull requests.

## License

This project is open source and available under the MIT License.

## Contact

For questions or support, please reach out through the contact form on the website.
