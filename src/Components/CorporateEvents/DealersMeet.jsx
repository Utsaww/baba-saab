import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const DealersMeet = () => {
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
                Forge Connections: Elevate Dealer Engagement with Dynamic
                Meetings
              </h1>
              <p className={styles?.weddingText}>
                Revitalize your dealer meetings with Baba Saab Event's dynamic
                corporate event services in Ramanagar, Jim Corbett, Moradabad,
                Rampur, Amroha, Kashipur, Haldwani, Rudrapur, Bareilly,
                Ghaziabad, Noida, Delhi, Nainital, and Bhimtal.
              </p>
              <p className={styles?.weddingText}>
                We specialize in creating engaging and productive environments
                where dealers can connect, collaborate, and thrive. From venue
                selection to agenda planning and logistics, our team ensures
                that every aspect of your event is tailored to meet your goals
                and objectives.
              </p>
              <p className={styles?.weddingText}>
                Whether you're looking to strengthen relationships, share
                important updates, or launch new initiatives, we work closely
                with you to create a customized experience that resonates with
                your audience. Our attention to detail and commitment to
                excellence ensure that your dealer meeting is a success, leaving
                a lasting impression on all who attend.
              </p>
              <p className={styles?.weddingText}>
                Let Baba Saab Event take your dealer meetings to the next level,
                so you can foster meaningful connections and drive business
                growth. With our expertise and dedication, your event is sure to
                be a memorable and impactful experience for everyone involved.
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

export default DealersMeet;
