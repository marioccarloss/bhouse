$(window).on("load", function () {
  $(".mdl-benefits").each(function () {
    var $module = $(this);

    // Video autoplay logic
    $module.find(".js-lazy-video").each(function () {
      var video = this;

      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;

      var playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(function (error) {
          console.log("Autoplay prevented:", error);
        });
      }
    });

    // Intersection Observer for animation (v-active)
    if ("IntersectionObserver" in window) {
      var observerOptions = {
        root: null,
        rootMargin: "-20% 0px -20% 0px", // Margin to focus on the center of the screen
        threshold: 0.2, // Trigger when 20% is visible within the margin
      };

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            $(entry.target).addClass("v-active");
          } else {
            $(entry.target).removeClass("v-active");
          }
        });
      }, observerOptions);

      $module.find(".m-card").each(function () {
        observer.observe(this);
      });
    }
  });
});
