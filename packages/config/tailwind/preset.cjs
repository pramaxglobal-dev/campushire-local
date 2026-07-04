const primary = {
  50: "#eef4ff",
  100: "#dbe9ff",
  200: "#bdd4ff",
  300: "#8fb4ff",
  400: "#5a8dff",
  500: "#3567f5",
  600: "#244ed6",
  700: "#1b3a6b",
  800: "#162f56",
  900: "#132949",
  950: "#0d1a2f"
};

const accent = {
  50: "#f0faff",
  100: "#dff4ff",
  200: "#b8e8ff",
  300: "#7fd8ff",
  400: "#3fc3f8",
  500: "#0ea5e9",
  600: "#0b87c3",
  700: "#0d6b9b",
  800: "#115a80",
  900: "#144b6a",
  950: "#0b3046"
};

module.exports = {
  theme: {
    extend: {
      colors: {
        primary,
        accent
      }
    }
  }
};