import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import InstaGramSection from "../InstaGramSection/InstaGramSection";
import OtherLinksSection from "../OtherLinksSection/OtherLinksSection";

const CelebrityManagement = () => {
  const weddingServiceData = [
    {
      id: 1,
      cardNumber: "01",
      cardHeading: "Destination wedding",
      cardContent:
        "Experience the romance, adventure, and beauty of these enchanting destinations as you embark on the journey of a lifetime with your beloved. Let us turn your dream wedding into a reality, creating cherished memories that will last a lifetime.",
      backgroundImage: "",
      route: "/wedding_planner/destination_wedding",
    },
    {
      id: 2,
      cardNumber: "02",
      cardHeading: "Hospitality team",
      cardContent:
        "Experience the vibrant energy of Ghaziabad, Noida, and Delhi, as we transform iconic venues into the perfect setting for your love story. With our expertise, we bring your vision to life, ensuring that every moment is filled with joy and enchantment.",
      backgroundImage: "",
      route: "/wedding_planner/hospitality_team",
    },
    {
      id: 3,
      cardNumber: "03",
      cardHeading: "Decorations",
      cardContent:
        "Let Baba Saab Event take the stress out of decorating, so you can focus on creating unforgettable memories with your loved ones. With our attention to detail and dedication to excellence, your celebration in any of these stunning locations will be nothing short of spectacular!",
      backgroundImage: "",
      route: "/wedding_planner/decorations",
    },
    {
      id: 4,
      cardNumber: "04",
      cardHeading: "Jaimala Theme",
      cardContent:
        "Whether you're dreaming of a classic Jaimala stage or seeking something new and innovative, our team crafts stunning designs that reflect your style and vision. Picture-perfect settings adorned with vibrant blooms, intricate designs, and captivating themes create the perfect backdrop for your Jaimala ceremony.",
      backgroundImage: "",
      route: "/wedding_planner/jaimala_theme",
    },
    {
      id: 5,
      cardNumber: "05",
      cardHeading: "Event Execution",
      cardContent:
        "Let Baba Saab Event be your partner in creating unforgettable moments with our Event Execution Services across enchanting destinations like Ramanagar, Jim Corbett, Moradabad, Rampur, Amroha, Kashipur, Haldwani, Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital, and Bhimtal.",
      backgroundImage: "",
      route: "/wedding_planner/event_execution",
    },
    {
      id: 6,
      cardNumber: "06",
      cardHeading: "Wedding Venues",
      cardContent:
        "Discover the perfect wedding venue with Baba Saab Event across enchanting locations like Ramanagar, Jim Corbett, Moradabad, Rampur, Amroha, Kashipur, Haldwani, Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital, and Bhimtal.",
      backgroundImage: "",
      route: "/wedding_planner/wedding_venus",
    },
    {
      id: 7,
      cardNumber: "07",
      cardHeading: "Stage Decorations",
      cardContent:
        "Whether you're celebrating a birthday or any special occasion, our stage balloon decorations are sure to impress, adding a pop of color and excitement to your event. From simple and elegant designs to elaborate arrangements, we tailor our decorations to suit your style and preferences.",
      backgroundImage: "",
      route: "/wedding_planner/stage_decorations",
    },
    {
      id: 8,
      cardNumber: "08",
      cardHeading: "Entertainment.",
      cardContent:
        "Get ready to be entertained like never before with Baba Saab Event's spectacular entertainment offerings in Ramanagar, Jim Corbett, Moradabad, Rampur, Amroha, Kashipur, Haldwani, Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital, and Bhimtal.",
      backgroundImage: "",
      route: "/wedding_planner/entertainement",
    },
  ];
  const topService = [
    {
      id: 1,
      routeName: "Wedding Planning",
      routeLink: "/wedding_planner",
    },
    {
      id: 2,
      routeName: "Event Planning",
      routeLink: "/event_planning",
    },
    {
      id: 3,
      routeName: "Corporate Events",
      routeLink: "/corporate_events",
    },
    {
      id: 4,
      routeName: "Birthday celebration",
      routeLink: "/birthday_celebration",
    },
    {
      id: 5,
      routeName: "Celebrity Management",
      routeLink: "/celebrity_management",
    },
    {
      id: 6,
      routeName: "Entertainment",
      routeLink: "/entertainment",
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
                Elevate Your Event to Stardom with Celebrity Management
                Services!
              </h1>
              <p className={styles?.weddingText}>
                Turn your event into a star-studded affair with our Celebrity
                Management services. Whether you're planning a corporate
                function, product launch, gala dinner, or private party, we'll
                help you secure the perfect celebrity to add glamour,
                excitement, and prestige to your event. Our experienced team
                handles every aspect of celebrity management, from negotiating
                contracts and coordinating schedules to ensuring smooth
                logistics and providing on-site support. Let us take your event
                to the next level by bringing the sparkle of celebrity to your
                guests' experience. With our expertise, your event will shine
                bright and create unforgettable memories for all attendees.
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

export default CelebrityManagement;
