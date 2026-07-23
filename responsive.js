/*
=========================================================
 CRDG RUMMY RESPONSIVE LAYOUT

 Desktop / Laptop:
 - Normal layout
 - No scaling
 - Scrolling allowed

 Mobile:
 - Entire 1280 × 720 game is scaled to fit
 - Scrolling disabled
=========================================================
*/

(function () {
    "use strict";

    const DESIGN_WIDTH = 1280;
    const DESIGN_HEIGHT = 720;
    const MOBILE_BREAKPOINT = 900;

    let resizeTimer = null;
    let appElement = null;

    function getAppElement() {
        if (!appElement) {
            appElement = document.getElementById("app");
        }

        return appElement;
    }

    function isMobileScreen() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    /*
    =====================================================
     LAPTOP / DESKTOP MODE
    =====================================================
    */
    function enableDesktopMode() {
        const app = getAppElement();

        if (!app) {
            return;
        }

        document.documentElement.style.width = "";
        document.documentElement.style.height = "";
        document.documentElement.style.overflow = "";

        document.body.style.width = "";
        document.body.style.height = "";
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.display = "";

        app.style.position = "";
        app.style.left = "";
        app.style.top = "";
        app.style.width = "";
        app.style.height = "";
        app.style.minWidth = "";
        app.style.minHeight = "";
        app.style.transform = "";
        app.style.transformOrigin = "";
    }

    /*
    =====================================================
     MOBILE MODE
    =====================================================
    */
    function enableMobileMode() {
        const app = getAppElement();

        if (!app) {
            return;
        }

        /*
         Do not calculate the game while it is hidden.
         The observer will call this again after it opens.
        */
        if (app.classList.contains("hidden")) {
            return;
        }

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const scaleX = viewportWidth / DESIGN_WIDTH;
        const scaleY = viewportHeight / DESIGN_HEIGHT;

        const scale = Math.min(scaleX, scaleY);

        const scaledWidth = DESIGN_WIDTH * scale;
        const scaledHeight = DESIGN_HEIGHT * scale;

        const leftPosition = Math.max(
            0,
            (viewportWidth - scaledWidth) / 2
        );

        const topPosition = Math.max(
            0,
            (viewportHeight - scaledHeight) / 2
        );

        document.documentElement.style.width = "100%";
        document.documentElement.style.height = "100%";
        document.documentElement.style.overflow = "hidden";

        document.body.style.width = "100%";
        document.body.style.height = "100%";
        document.body.style.overflow = "hidden";
        document.body.style.position = "relative";
        document.body.style.display = "block";

        app.style.position = "fixed";
        app.style.left = `${leftPosition}px`;
        app.style.top = `${topPosition}px`;

        app.style.width = `${DESIGN_WIDTH}px`;
        app.style.height = `${DESIGN_HEIGHT}px`;
        app.style.minWidth = `${DESIGN_WIDTH}px`;
        app.style.minHeight = `${DESIGN_HEIGHT}px`;

        app.style.transformOrigin = "top left";
        app.style.transform = `scale(${scale})`;
    }

    /*
    =====================================================
     APPLY CORRECT MODE
    =====================================================
    */
    function applyResponsiveMode() {
        if (isMobileScreen()) {
            enableMobileMode();
        } else {
            enableDesktopMode();
        }
    }

    /*
    =====================================================
     RESIZE HANDLER
    =====================================================
    */
    function handleResize() {
        clearTimeout(resizeTimer);

        resizeTimer = setTimeout(function () {
            applyResponsiveMode();
        }, 100);
    }

    /*
    =====================================================
     WATCH FOR GAME SCREEN OPENING
    =====================================================
    */
    function observeGameScreen() {
        const app = getAppElement();

        if (!app) {
            return;
        }

        const observer = new MutationObserver(function (mutations) {
            for (const mutation of mutations) {
                if (
                    mutation.type === "attributes" &&
                    mutation.attributeName === "class"
                ) {
                    requestAnimationFrame(function () {
                        applyResponsiveMode();
                    });
                }
            }
        });

        observer.observe(app, {
            attributes: true,
            attributeFilter: ["class"]
        });
    }

    window.addEventListener("resize", handleResize);

    window.addEventListener("orientationchange", function () {
        setTimeout(function () {
            applyResponsiveMode();
        }, 300);
    });

    window.addEventListener("load", function () {
        applyResponsiveMode();
        observeGameScreen();
    });

    /*
     You can call this manually after opening the game screen:

     window.refreshRummyLayout();
    */
    window.refreshRummyLayout = applyResponsiveMode;
})();