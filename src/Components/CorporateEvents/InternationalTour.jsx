import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const InternationalTour = () => {
  const topService = [
    {
      id: 1,
      routeName: "Product Launch",
      routeLink: "/corporate_events/product_launch",
    },
    {
      id: 2,
      routeName: "Dealers meet",
      routeLink: "/corporate_events/dealers_meet",
    },
    {
      id: 3,
      routeName: "Annual Function",
      routeLink: "/corporate_events/annual_function",
    },
    {
      id: 4,
      routeName: "International tour planning",
      routeLink: "/corporate_events/international_tour",
    },
    {
      id: 5,
      routeName: "Fabrication",
      routeLink: "/corporate_events/fabrication",
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
                Expand Horizons: Seamlessly Planned International Tours for
                Business and Leisure
              </h1>
              <p className={styles?.weddingText}>
                Embark on an unforgettable international tour with Baba Saab
                Event's expert planning services in Ramanagar, Jim Corbett,
                Moradabad, Rampur, Amroha, Kashipur, Haldwani, Rudrapur,
                Bareilly, Ghaziabad, Noida, Delhi, Nainital, and Bhimtal.
              </p>
              <p className={styles?.weddingText}>
                We specialize in crafting bespoke travel experiences that cater
                to your unique preferences and interests. Whether you dream of
                exploring exotic destinations, immersing yourself in different
                cultures, or simply relaxing on pristine beaches, we'll work
                closely with you to create a customized itinerary that exceeds
                your expectations.
              </p>
              <p className={styles?.weddingText}>
                From arranging flights and accommodations to planning
                sightseeing tours and cultural experiences, our team handles
                every aspect of your international tour with meticulous
                attention to detail. With our expertise and dedication, you can
                relax and enjoy the journey, knowing that every detail is taken
                care of.
              </p>
              <p className={styles?.weddingText}>
                Let Baba Saab Event turn your travel dreams into reality,
                creating unforgettable memories that will last a lifetime.
                Whether you're traveling solo, with family, or with colleagues,
                we'll ensure that your international tour is an extraordinary
                experience from start to finish.
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

export default InternationalTour;
