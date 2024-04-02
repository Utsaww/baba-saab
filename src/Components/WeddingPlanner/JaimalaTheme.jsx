import React from "react";
import styles from "./weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const JaimalaTheme = () => {
  const topService = [
    {
      id: 1,
      routeName: "Destination wedding",
      routeLink: "/wedding_planner/destination_wedding",
    },
    {
      id: 2,
      routeName: "Hospitality team",
      routeLink: "/wedding_planner/hospitality_team",
    },
    {
      id: 3,
      routeName: "Decoration",
      routeLink: "/wedding_planner/decorations",
    },
    {
      id: 4,
      routeName: "Jaimala theme",
      routeLink: "/wedding_planner/jaimala_theme",
    },
    {
      id: 5,
      routeName: "Event Execution",
      routeLink: "/wedding_planner/event_execution",
    },
    {
      id: 6,
      routeName: "Wedding venues",
      routeLink: "/wedding_planner/wedding_venues",
    },
    {
      id: 7,
      routeName: "Stage Decorations",
      routeLink: "/wedding_planner/stage_decorations",
    },
    {
      id: 6,
      routeName: "Entertainment",
      routeLink: "/wedding_planner/entertainment",
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
                Embrace Tradition with Elegance: Explore Our Jaimala Themes
              </h1>
              <p className={styles?.weddingText}>
                Enter the realm of enchantment with Baba Saab Event's
                mesmerizing Jaimala themes across Ramanagar, Jim Corbett,
                Moradabad, Rampur, Amroha, Kashipur, Haldwani, Rudrapur,
                Bareilly, Ghaziabad, Noida, Delhi, Nainital, and Bhimtal. Our
                flower Jaimala stages are a sight to behold, blending elegance
                and tradition in perfect harmony.
              </p>
              <p className={styles?.weddingText}>
                Whether you're dreaming of a classic Jaimala stage or seeking
                something new and innovative, our team crafts stunning designs
                that reflect your style and vision. Picture-perfect settings
                adorned with vibrant blooms, intricate designs, and captivating
                themes create the perfect backdrop for your Jaimala ceremony.
              </p>
              <p className={styles?.weddingText}>
                From traditional to contemporary, our Jaimala themes capture the
                essence of your love story, making your special moment truly
                unforgettable. Let us transform your wedding into a magical
                celebration where every detail, from the Jaimala stage to the
                ceremony itself, is a reflection of your unique journey
                together.
              </p>
              <p className={styles?.weddingText}>
                With Baba Saab Event, your Jaimala ceremony becomes a beautiful
                expression of love, surrounded by the breathtaking beauty of
                your chosen destination.
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

export default JaimalaTheme;
