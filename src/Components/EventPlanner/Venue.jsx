import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const Venue = () => {
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
                Discover Your Perfect Venue: Where Dreams Meet Reality
              </h1>
              <p className={styles?.weddingText}>
                Let us help you bring your event vision to life with our Event
                Planning Venue services in Ramanagar, Jim Corbett, Moradabad,
                Rampur, Amroha, Kashipur, Haldwani, Rudrapur, Bareilly,
                Ghaziabad, Noida, Delhi, Nainital, and Bhimtal!
              </p>
              <p className={styles?.weddingText}>
                Our friendly and experienced team will work closely with you to
                find the perfect venue that suits your needs and preferences.
                Whether you're hosting a wedding, corporate event, or special
                celebration, we have a variety of stunning venues to choose
                from.
              </p>
              <p className={styles?.weddingText}>
                From elegant banquet halls to picturesque outdoor spaces, we'll
                help you select the ideal setting that sets the stage for an
                unforgettable experience. With our attention to detail and
                commitment to excellence, you can relax and enjoy your event
                knowing that everything is taken care of.
              </p>
              <p className={styles?.weddingText}>
                Let us take the stress out of event planning and help you create
                memories that will last a lifetime. With our Event Planning
                Venue services, your event will be a resounding success from
                start to finish!
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

export default Venue;
