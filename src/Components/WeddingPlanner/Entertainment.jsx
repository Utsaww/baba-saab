import React from "react";
import styles from "./weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const Entertainment = () => {
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
                Unleash the Magic: Entertainment that Captivates and Delights
              </h1>
              <p className={styles?.weddingText}>
                Get ready to be entertained like never before with Baba Saab
                Event's spectacular entertainment offerings in Ramanagar, Jim
                Corbett, Moradabad, Rampur, Amroha, Kashipur, Haldwani,
                Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital, and
                Bhimtal.
              </p>
              <p className={styles?.weddingText}>
                From lively music and dance performances to mesmerizing magic
                shows and engaging activities, we bring the fun and excitement
                to your event. Whether you're hosting a wedding, a corporate
                function, or a private party, our entertainment options are sure
                to keep guests of all ages entertained and enthralled.
              </p>
              <p className={styles?.weddingText}>
                Let us create unforgettable moments with our diverse range of
                entertainment services, tailored to suit your preferences and
                theme. Whether you're seeking traditional folk dances,
                Bollywood-style performances, or interactive games and
                activities, our team ensures that every aspect of your event is
                filled with joy and laughter.
              </p>
              <p className={styles?.weddingText}>
                With Baba Saab Event, you can sit back, relax, and enjoy the
                show, knowing that your guests are in for a memorable and
                entertaining experience. Let us take your event to the next
                level with our top-notch entertainment offerings, guaranteed to
                leave a lasting impression on everyone in attendance.
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

export default Entertainment;
