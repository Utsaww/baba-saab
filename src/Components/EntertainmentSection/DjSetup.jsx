import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const DjSetup = () => {
  const topService = [
    {
      id: 1,
      routeName: "DJ setup",
      routeLink: "/entertainment/dj_setup",
    },
    {
      id: 2,
      routeName: "Live Band",
      routeLink: "/entertainment/live_band",
    },
    {
      id: 3,
      routeName: "Live music",
      routeLink: "/entertainment/live_music",
    },
    {
      id: 4,
      routeName: "Dancers and Entertainers",
      routeLink: "/entertainment/dancers_entertainers",
    },
    {
      id: 5,
      routeName: "Celebrity performance",
      routeLink: "/entertainment/celebrity_performance",
    },
  ];
  const instaData = [
    {
      id: 1,
      name: insta,
      alt: "insta",
    },
    {
      id: 2,
      name: insta,
      alt: "insta",
    },
    {
      id: 3,
      name: insta,
      alt: "insta",
    },
    {
      id: 4,
      name: insta,
      alt: "insta",
    },
    {
      id: 5,
      name: insta,
      alt: "insta",
    },
    {
      id: 6,
      name: insta,
      alt: "insta",
    },
  ];
  return (
    <>
      <section className={styles?.weddingPlanner}>
        <div className={styles?.container}>
          <div className={styles?.weddingPlannerContent}>
            <div className={styles?.leftContent}>
              <div className={styles?.leftImageWrapper}>
                <Image src={wedding} alt="wedding" fill priority />
              </div>
              <h1 className={styles?.weddingPlannerHeading}>
                Set the Beat: Energize Your Event with Our Dynamic DJ Setup
              </h1>
              <p className={styles?.weddingText}>
                Get ready to turn your events into unforgettable celebrations
                with our top-notch DJ setup services! Whether you're in
                Ramanagar, Jim Corbett, Moradabad, Rampur, Amroha, Kashipur,
                Haldwani, Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital,
                or Bhimtal, we bring the perfect beats to elevate your party.
              </p>
              <p className={styles?.weddingText}>
                DJ Setup: Our state-of-the-art equipment and skilled DJs ensure
                a musical experience that suits your unique style. From
                chart-topping hits to classic tunes, we tailor the playlist to
                create the perfect ambiance for your event.
              </p>
              <p className={styles?.weddingText}>
                Whether you're hosting a wedding, birthday bash, or corporate
                event, our DJ setup services guarantee a lively atmosphere that
                keeps the party going. Let the music speak, and watch as your
                guests hit the dance floor, creating moments of joy and
                celebration that will be remembered long after the last song
                fades away.
              </p>
              <p className={styles?.weddingText}>
                With our Entertainment Services, your event in any of these
                fantastic locations will be a hit! Trust us to bring the rhythm,
                energy, and fun to your special moments.
              </p>
            </div>
            <div className={styles?.rightContent}>
              <OtherLinksSection topService={topService} />
              <InstaGramSection instaData={instaData} />
            </div>
          </div>
        </div>
      </section>
      {/* <Service
        ServiceData={weddingServiceData}
        serviceName="Wedding Service"
        widthClass={styles?.changeWidthWrapper}
        className={styles?.weddingService}
        headingClass={styles?.headingWidth}
      /> */}
    </>
  );
};

export default DjSetup;
