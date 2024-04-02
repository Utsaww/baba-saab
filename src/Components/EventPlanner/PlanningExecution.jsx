import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const PlanningExecution = () => {
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
    }
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
                Precision in Every Detail: Planning & Execution Excellence
              </h1>
              <p className={styles?.weddingText}>
                Let's turn your vision into reality with our Event Planning
                Services in Ramanagar, Jim Corbett, Moradabad, Rampur, Amroha,
                Kashipur, Haldwani, Rudrapur, Bareilly, Ghaziabad, Noida, Delhi,
                Nainital, and Bhimtal!
              </p>
              <p className={styles?.weddingText}>
                🎉 Planning & Execution: From concept to completion, we handle
                every detail of your event with precision and care. Our
                experienced team ensures seamless coordination and flawless
                execution, so you can relax and enjoy every moment.
              </p>
              <p className={styles?.weddingText}>
                Whether you're hosting a wedding, corporate event, or private
                party, we work closely with you to understand your needs and
                preferences. From venue selection and decor to catering and
                entertainment, we tailor our services to create a memorable
                experience that exceeds your expectations.
              </p>
              <p className={styles?.weddingText}>
                With our Event Planning Services, you can trust us to bring your
                vision to life and make your event truly special. Let us take
                the stress out of planning so you can focus on celebrating and
                creating cherished memories with your loved ones.
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

export default PlanningExecution;
