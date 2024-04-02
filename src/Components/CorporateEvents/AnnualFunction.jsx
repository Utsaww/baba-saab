import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const AnnualFunction = () => {
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
                Celebrate Achievement: Memorable Annual Functions Tailored to
                Your Company Culture
              </h1>
              <p className={styles?.weddingText}>
                Let's make your corporate annual function a truly unforgettable
                experience with Baba Saab Event's expert services in Ramanagar,
                Jim Corbett, Moradabad, Rampur, Amroha, Kashipur, Haldwani,
                Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital, and
                Bhimtal.
              </p>
              <p className={styles?.weddingText}>
                We specialize in creating vibrant and memorable events that
                celebrate your company's achievements and inspire your team.
                From venue selection to theme development and entertainment, our
                team works tirelessly to ensure that every aspect of your annual
                function reflects your company's values and culture.
              </p>
              <p className={styles?.weddingText}>
                Whether you're looking to recognize top performers, motivate
                your team, or simply celebrate another successful year, we'll
                work closely with you to create a customized event that exceeds
                your expectations. With our attention to detail and commitment
                to excellence, your annual function is sure to be a hit with
                everyone in attendance.
              </p>
              <p className={styles?.weddingText}>
                Let Baba Saab Event take the stress out of planning your
                corporate annual function, so you can relax and enjoy the
                celebration with your team. With our expertise and dedication,
                your event is guaranteed to be a memorable and uplifting
                experience for all.
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

export default AnnualFunction;
