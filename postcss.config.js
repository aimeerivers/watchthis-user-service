import autoprefixer from "autoprefixer";
import postcssMinify from "postcss-minify";
import tailwindcss from "tailwindcss";

export default {
  plugins: [tailwindcss, autoprefixer, postcssMinify],
};
