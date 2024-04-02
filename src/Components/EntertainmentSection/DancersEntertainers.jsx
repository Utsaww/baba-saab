import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const DancersEntertainers = () => {
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
                Dazzle and Delight: Mesmerizing Dancers and Entertainers to
                Amaze Your Guests
              </h1>
              <p className={styles?.weddingText}>
                Get ready to dazzle and delight with our spectacular Dancers and
                Entertainers available in Ramanagar, Jim Corbett, Moradabad,
                Rampur, Amroha, Kashipur, Haldwani, Rudrapur, Bareilly,
                Ghaziabad, Noida, Delhi, Nainital, and Bhimtal!
              </p>
              <p className={styles?.weddingText}>
                Our talented performers bring the wow factor to any event,
                whether it's a wedding, corporate gathering, or private party.
                From graceful dancers to mesmerizing magicians, our entertainers
                are guaranteed to captivate your audience and leave them wanting
                more.
              </p>
              <p className={styles?.weddingText}>
                With their dazzling costumes, energetic performances, and
                interactive acts, our Dancers and Entertainers create an
                unforgettable experience for guests of all ages. Let them add a
                touch of magic and excitement to your special occasion, creating
                memories that will last a lifetime.
              </p>
              <p className={styles?.weddingText}>
                So, if you're looking to elevate your event and create moments
                that will leave a lasting impression, look no further than our
                Dancers and Entertainers. Get ready to dance, laugh, and be
                amazed as they take your event to the next level!
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

export default DancersEntertainers;
