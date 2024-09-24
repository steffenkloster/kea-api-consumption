import { authKey } from "./tmdb_api_key.js";

const FAKE_DELAY_MS = 1000;
const MAXIMUM_API_PAGES = 10;
const apiUrlPaths = [
  "movie/now_playing",
  "movie/popular",
  "movie/top_rated",
  "movie/upcoming"
];

const movies = [];
const genres = [];
let currentPage = 0;
let currentApiPage = 1;

// https://stackoverflow.com/a/19690464/17904373
const isRetinaDisplay = () => {
  if (window.matchMedia) {
    var mq = window.matchMedia(
      "only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen  and (min-device-pixel-ratio: 1.3), only screen and (min-resolution: 1.3dppx)"
    );
    return (mq && mq.matches) || window.devicePixelRatio > 1;
  }

  return false;
};

const options = (method) => {
  return {
    method: method,
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${authKey}`
    }
  };
};

const switchPage = (page) => {
  if (currentPage == page) return;

  errorElement.classList.add("hidden");
  currentPage = page;
  currentApiPage = 1;
  movies.length = 0;
  spinner.classList.add("visible");
  getMovies(true);
};

const pageLinks = document.querySelectorAll("a[page]");
pageLinks.forEach((element) => {
  element.addEventListener("click", (e) => {
    e.preventDefault();
    switchPage(element.getAttribute("page"));
    pageLinks.forEach((link) =>
      link.classList.toggle(
        "active",
        link.getAttribute("page") === String(currentPage)
      )
    );
  });
});

const backgroundImage = document.getElementById("background-image");
let imageLoaded = false;
let backgroundChangeTimeout;
let resetTimeout;
let currentBackground = "";

const changeBackgroundImage = (url) => {
  if (backgroundChangeTimeout) {
    clearTimeout(backgroundChangeTimeout);
  }

  if (resetTimeout) {
    clearTimeout(resetTimeout);
  }

  if (url === currentBackground) {
    return;
  }

  if (url === "") {
    backgroundImage.classList.remove("visible");

    resetTimeout = setTimeout(() => {
      imageLoaded = false;
      currentBackground = "";
    }, 300);
    return;
  }

  if (currentBackground === "") {
    const img = new Image();
    img.src = url;

    img.onload = () => {
      backgroundImage.style.backgroundImage = `url(${url})`;
      backgroundImage.classList.add("visible");
      currentBackground = url;
      imageLoaded = true;
    };
  } else {
    backgroundImage.classList.remove("visible");

    backgroundChangeTimeout = setTimeout(() => {
      const img = new Image();
      img.src = url;

      img.onload = () => {
        backgroundImage.style.backgroundImage = `url(${url})`;
        backgroundImage.classList.add("visible");
        currentBackground = url;
        imageLoaded = true;
      };
    }, 300);
  }
};

const errorElement = document.querySelector("#error");
const handleApiError = async (response) => {
  const json = await response.json();
  console.error(json);

  errorElement.querySelector(
    ".error-title"
  ).textContent = `API call failed (Code: ${json.status_code})`;
  errorElement.querySelector(".error-message").textContent =
    json.status_message;
  errorElement.classList.remove("hidden");
  spinner.classList.remove("visible");
};

let loading = false;
const apiCall = async (url, page, callback, fakeDelay = 0) => {
  loading = true;
  setTimeout(() => {
    fetch(
      `https://api.themoviedb.org/3/${url}?language=en-US&page=${page}`,
      options("GET")
    )
      .then((response) => {
        if (!response.ok) {
          handleApiError(response);
          throw new Error("API call failed");
        }
        return response.json();
      })
      .then((response) => callback(response))
      .catch((err) => console.log(err))
      .finally(() => (loading = false));
  }, fakeDelay);
};

const getMovies = async (clear = false) => {
  if (loading) {
    return;
  }

  if (currentApiPage > MAXIMUM_API_PAGES) {
    spinner.classList.remove("visible");
    return;
  }

  const moviesContainer = document.querySelector("#movies");
  if (clear) {
    moviesContainer.innerHTML = "";
  }

  loading = true;
  apiCall(
    apiUrlPaths[currentPage],
    currentApiPage,
    (data) => {
      currentApiPage++;

      movies.push(...data.results);

      data.results.forEach((movie) => {
        const newMovie = document.importNode(
          document.getElementById("movie-row").content,
          true
        );

        const movieArticle = newMovie.querySelector("article");
        movieArticle.addEventListener("mouseenter", () =>
          changeBackgroundImage(
            `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
          )
        );

        movieArticle.addEventListener("mouseleave", () =>
          changeBackgroundImage("")
        );

        const moviePoster = newMovie.querySelector(".poster");
        const movieTitle = newMovie.querySelector(".title");
        const movieTitle2 = newMovie.querySelector(".title2");
        const movieOverview = newMovie.querySelector(".overview");
        const movieOriginalTitle = newMovie.querySelector(".original-title");
        const movieReleaseDate = newMovie.querySelector(".release-date");
        const movieVotes = newMovie.querySelector(".votes");
        const movieGenres = newMovie.querySelector(".genres");

        moviePoster.src = `https://image.tmdb.org/t/p/${
          isRetinaDisplay() ? "w400" : "w200"
        }${movie.poster_path}`;
        moviePoster.alt = `${movie.title} poster`;
        movieTitle.childNodes[0].nodeValue = `${movie.title} `;
        movieTitle.childNodes[1].innerText = `(${movie.release_date.slice(
          0,
          4
        )})`;

        movieTitle2.textContent = movie.title;
        movieOverview.textContent = movie.overview;
        movieOriginalTitle.textContent = movie.original_title;
        movieReleaseDate.textContent = movie.release_date;
        movieVotes.textContent = `${movie.vote_count} user votes`;

        movieGenres.innerHTML = movie.genre_ids
          .map(
            (genreId) =>
              genres.find((genre) => genre.id === genreId)?.name ?? "Unknown"
          )
          .map((genre) => `<li>${genre}</li>`)
          .join("");

        const userRating = Number(movie.vote_average / 2).toFixed(1);
        const movieRating = newMovie.querySelector(".rating");
        movieRating.value = userRating;
        movieRating.title = `${userRating} stars`;
        movieRating.querySelector(
          "span"
        ).textContent = `${userRating}/5 star user rating from ${movie.vote_count} votes`;

        moviesContainer.appendChild(newMovie);
      });
    },
    FAKE_DELAY_MS
  );
};

const spinner = document.querySelector("#spinner");
let ticking = false;

const handleScroll = () => {
  const spinnerRect = spinner.getBoundingClientRect();
  const spinnerInView =
    spinnerRect.top >= 0 &&
    spinnerRect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) + 32;

  if (spinnerInView) {
    getMovies();
  }
};

document.addEventListener("scroll", () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      if (genres.length > 0) {
        handleScroll();
      }

      ticking = false;
    });

    ticking = true;
  }
});

apiCall("genre/movie/list", 1, (data) => {
  genres.push(...data.genres);
  loading = false;
  handleScroll();
});
