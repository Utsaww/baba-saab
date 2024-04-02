import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const CelebrityPerformance = () => {
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
                Star-Studded Spectacle: Bring Glamour to Your Event with
                Celebrity Performances
              </h1>
              <p className={styles?.weddingText}>
                Get ready for a night of glamour and excitement with our
                Celebrity Performance service, available in Ramanagar, Jim
                Corbett, Moradabad, Rampur, Amroha, Kashipur, Haldwani,
                Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital, and
                Bhimtal!
              </p>
              <p className={styles?.weddingText}>
                Imagine the thrill of watching your favorite celebrity perform
                live, right at your event. Whether it's a renowned singer,
                mesmerizing dancer, or hilarious comedian, their star power will
                dazzle your guests and create unforgettable memories.
              </p>
              <p className={styles?.weddingText}>
                From intimate gatherings to grand celebrations, our Celebrity
                Performance service adds a touch of magic and prestige to any
                occasion. Let us bring the glitz and glamour of the
                entertainment world to your event, making it a truly
                unforgettable experience for you and your guests.
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

export default CelebrityPerformance;
