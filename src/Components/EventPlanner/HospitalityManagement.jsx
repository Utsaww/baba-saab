import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const HospitalityManagement = () => {
  const topService = [
    {
      id: 1,
      routeName: "Planning & execution",
      routeLink: "/event_planning/planning_execution",
    },
    {
      id: 2,
      routeName: "Venue",
      routeLink: "/event_planning/venue",
    },
    {
      id: 3,
      routeName: "Hospitality Management",
      routeLink: "/event_planning/hospitality_management",
    },
    {
      id: 4,
      routeName: "Event Budgeting",
      routeLink: "/event_planning/event_budgeting",
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
                Seamless Hospitality Management: Elevating Your Guest Experience
              </h1>
              <p className={styles?.weddingText}>
                Experience seamless event planning and hospitality management
                with us in Ramanagar, Jim Corbett, Moradabad, Rampur, Amroha,
                Kashipur, Haldwani, Rudrapur, Bareilly, Ghaziabad, Noida, Delhi,
                Nainital, and Bhimtal!
              </p>
              <p className={styles?.weddingText}>
                From intimate gatherings to grand celebrations, we handle every
                detail with care and expertise to ensure a memorable experience
                for you and your guests. Whether it's a wedding, corporate
                event, or social gathering, our dedicated team works tirelessly
                to bring your vision to life.
              </p>
              <p className={styles?.weddingText}>
                With our personalized approach and attention to detail, we take
                the stress out of event planning, allowing you to relax and
                enjoy every moment. From venue selection and decor to catering
                and logistics, we've got you covered every step of the way.
              </p>
              <p className={styles?.weddingText}>
                Let us turn your event into a seamless and unforgettable
                experience, leaving you with cherished memories that last a
                lifetime. Sit back, relax, and let us take care of the rest with
                our top-notch event planning and hospitality management
                services!
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

export default HospitalityManagement;
