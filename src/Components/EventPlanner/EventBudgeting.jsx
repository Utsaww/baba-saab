import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const EventBudgeting = () => {
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
                Smart Event Budgeting: Turning Vision into Reality Without
                Breaking the Bank
              </h1>
              <p className={styles?.weddingText}>
                Let's make your event planning stress-free and budget-friendly
                in Ramanagar, Jim Corbett, Moradabad, Rampur, Amroha, Kashipur,
                Haldwani, Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital,
                and Bhimtal!
              </p>
              <p className={styles?.weddingText}>
                Our expert event planners are here to help you every step of the
                way, from conceptualizing your event to executing it within your
                budget. We'll work closely with you to understand your vision
                and priorities, then create a detailed plan that maximizes your
                resources without compromising on quality.
              </p>
              <p className={styles?.weddingText}>
                With our meticulous event budgeting, you can rest assured that
                every penny is accounted for and allocated wisely. Whether it's
                negotiating with vendors, finding cost-effective solutions, or
                making strategic adjustments, we'll ensure that your event stays
                on track financially while exceeding your expectations.
              </p>
              <p className={styles?.weddingText}>
                Let us take the guesswork out of event planning and budgeting,
                so you can relax and enjoy the journey to your special day. With
                our dedicated team by your side, your event will be a resounding
                success without breaking the bank.
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

export default EventBudgeting;
