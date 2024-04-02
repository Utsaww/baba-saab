import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const LiveMusic = () => {
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
                Feel the Vibes: Groove to the Rhythm of Live Music That Moves
                You
              </h1>
              <p className={styles?.weddingText}>
                Get ready to be serenaded by the sweet sounds of live music in
                Ramanagar, Jim Corbett, Moradabad, Rampur, Amroha, Kashipur,
                Haldwani, Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital,
                and Bhimtal! Our Entertainment Services bring the magic of live
                music to your event, creating an atmosphere that's filled with
                joy and melody.
              </p>
              <p className={styles?.weddingText}>
                Whether you're hosting a wedding, corporate event, or private
                party, our talented musicians will set the perfect tone for your
                occasion. From soulful ballads to upbeat tunes, our live music
                performances cater to all tastes and preferences.
              </p>
              <p className={styles?.weddingText}>
                Sit back, relax, and let the music transport you to another
                world as our musicians take center stage. With their skillful
                performances and infectious energy, they'll leave your guests
                tapping their toes and singing along.
              </p>
              <p className={styles?.weddingText}>
                With our Live Music Entertainment Services, your event will be a
                memorable and enchanting experience for all. So why wait? Let us
                bring the magic of live music to your next event and create
                moments that will be cherished forever.
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

export default LiveMusic;
