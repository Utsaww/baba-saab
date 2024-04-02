import React from "react";
import styles from "./weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const StageDecorations = () => {
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
                Elevate Your Event: Captivating Stage Decorations Await
              </h1>
              <p className={styles?.weddingText}>
                Add a touch of magic to your special occasions with Baba Saab
                Event's exquisite stage decorations across enchanting
                destinations like Ramanagar, Jim Corbett, Moradabad, Rampur,
                Amroha, Kashipur, Haldwani, Rudrapur, Bareilly, Ghaziabad,
                Noida, Delhi, Nainital, and Bhimtal.
              </p>
              <p className={styles?.weddingText}>
                For your little one's first birthday, we create adorable stage
                decorations filled with whimsy and wonder, featuring vibrant
                colors and playful designs that will delight both children and
                adults alike. Our birthday stage balloon decorations add an
                extra element of fun, with stunning arrangements that bring joy
                to any celebration.
              </p>
              <p className={styles?.weddingText}>
                Whether you're celebrating a birthday or any special occasion,
                our stage balloon decorations are sure to impress, adding a pop
                of color and excitement to your event. From simple and elegant
                designs to elaborate arrangements, we tailor our decorations to
                suit your style and preferences.
              </p>
              <p className={styles?.weddingText}>
                With Baba Saab Event, you can trust us to handle all types of
                stage decorations with creativity and expertise. Whether you're
                planning a birthday party, a wedding, or any other event, our
                team will transform your venue into a breathtaking masterpiece
                that sets the stage for unforgettable memories.
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

export default StageDecorations;
