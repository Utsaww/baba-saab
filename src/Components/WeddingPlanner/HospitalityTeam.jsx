import React from "react";
import styles from "./weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const HospitalityTeam = () => {
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
                Creating Unforgettable Memories: Meet Our Expert Hospitality
                Team
              </h1>
              <p className={styles?.weddingText}>
                Join us on an unforgettable journey with Baba Saab Event
                Hospitality team to create your dream destination wedding amidst
                the breathtaking beauty of Ramanagar, Jim Corbett, Moradabad,
                Rampur, Amroha, Kashipur, Haldwani, Rudrapur, Bareilly,
                Ghaziabad, Noida, Delhi, Nainital, and Bhimtal.
              </p>
              <p className={styles?.weddingText}>
                Our dedicated team specializes in crafting magical moments in
                these picturesque locations, where every detail is meticulously
                planned to perfection. From the tranquil forests of Ramanagar to
                the majestic landscapes of Jim Corbett and the historic charm of
                Moradabad and Rampur, we ensure your wedding reflects the unique
                essence of each destination.
              </p>
              <p className={styles?.weddingText}>
                In the serene surroundings of Kashipur, Haldwani, Rudrapur, and
                Bareilly, let us weave together the beauty of nature with
                seamless hospitality, creating a truly memorable experience for
                you and your guests. Whether you envision an intimate affair or
                a grand celebration, our team is here to make your dreams come
                true.
              </p>
              <p className={styles?.weddingText}>
                Experience the vibrant energy of Ghaziabad, Noida, and Delhi, as
                we transform iconic venues into the perfect setting for your
                love story. With our expertise, we bring your vision to life,
                ensuring that every moment is filled with joy and enchantment.
              </p>
              <p className={styles?.weddingText}>
                Escape to the serene lakeside vistas of Nainital and Bhimtal,
                where the serene beauty of the mountains and the shimmering
                waters create a magical setting for your special day. With our
                destination wedding planning services, you can relax and enjoy
                every moment, knowing that your wedding in the lap of nature
                will be nothing short of spectacular.
              </p>
              <p className={styles?.weddingText}>
                Escape to the tranquility of Nainital and Bhimtal, where the
                shimmering lakes and majestic mountains provide a breathtaking
                backdrop for your special day. Let us take care of every detail,
                so you can relax and enjoy the magic of your destination wedding
                with Baba Saab Event Hospitality team.
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

export default HospitalityTeam;
