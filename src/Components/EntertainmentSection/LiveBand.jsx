import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const LiveBand = () => {
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
                Live and Lively: Experience the Magic of a Live Band Performance
              </h1>
              <p className={styles?.weddingText}>
                Get ready to experience the magic of live music with our
                Entertainment Services featuring Live Bands in Ramanagar, Jim
                Corbett, Moradabad, Rampur, Amroha, Kashipur, Haldwani,
                Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital, and
                Bhimtal!
              </p>
              <p className={styles?.weddingText}>
                Immerse yourself in the soulful melodies and electrifying
                performances of our talented bands. Whether you're hosting a
                wedding, corporate event, or private party, our Live Bands will
                set the perfect tone and create an unforgettable atmosphere.
              </p>
              <p className={styles?.weddingText}>
                From classic hits to contemporary favorites, our bands cater to
                a diverse range of musical tastes. Let the rhythm of the drums,
                the strumming of the guitar, and the harmonies of the vocals
                sweep you off your feet and make your event truly memorable.
              </p>
              <p className={styles?.weddingText}>
                With our Live Band Entertainment Services, you can sit back,
                relax, and enjoy the show as our musicians captivate your
                audience and leave them wanting more. Let us add a touch of live
                music magic to your next event and create moments that will be
                cherished forever.
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

export default LiveBand;
