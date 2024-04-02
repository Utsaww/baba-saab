import React from "react";
import styles from "./weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const Decoration = () => {
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
                Setting the Stage for Splendor: Let Us Decorate Your Special Day
              </h1>
              <p className={styles?.weddingText}>
                Let Baba Saab Event sprinkle a touch of magic to your
                celebrations with our exquisite decorations in Ramanagar, Jim
                Corbett, Moradabad, Rampur, Amroha, Kashipur, Haldwani,
                Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital, and
                Bhimtal! Whether it's a birthday bash for your little prince or
                princess, or a wedding filled with love and laughter, our team
                brings creativity and elegance to every detail.
              </p>
              <p className={styles?.weddingText}>
                For birthday boys, we create enchanting themes filled with
                adventure and excitement, from superhero extravaganzas to
                sports-themed wonders. And for our lovely birthday girls, we
                craft dreamy setups with fairytale motifs or glamorous princess
                themes that will make their special day truly magical.
              </p>
              <p className={styles?.weddingText}>
                When it comes to weddings, we understand that every couple has
                their own unique style and vision. From traditional elegance to
                contemporary chic, our decorations capture the essence of your
                love story. Whether you're exchanging vows amidst the wilderness
                of Jim Corbett or in the grandeur of Delhi, our team transforms
                venues into breathtaking spaces that reflect your personality
                and dreams.
              </p>
              <p className={styles?.weddingText}>
                Let Baba Saab Event take the stress out of decorating, so you
                can focus on creating unforgettable memories with your loved
                ones. With our attention to detail and dedication to excellence,
                your celebration in any of these stunning locations will be
                nothing short of spectacular!
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

export default Decoration;
