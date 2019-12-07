import React from 'react';
import { render } from 'react-dom';
import styled from 'styled-components';
import dataset from './small-dataset';
import { useDrag, useDrop } from 'react-dnd';
import { DndProvider } from 'react-dnd';
import Backend from 'react-dnd-html5-backend';
import _ from 'lodash/fp';
import _formatDecimal from 'format-decimal';

function formatDecimal(number) {
    return _formatDecimal(number).split(',')[0];
}

const ItemTypes = {
    OBJECT: 'object'
};

function parseYear(year) {
    return parseInt(year, 10);
}

const exhibitionObjects = (
    _.flow(
        _.filter(object => object.bilder.length > 0 && object.datierung),
        _.map(object => {
            const start = _.min(_.map(({ anfang }) => parseYear(anfang), object.datierung));
            const end = _.max(_.map(({ ende }) => parseYear(ende), object.datierung));

            const previewUrl = object.bilder[0].pfad.replace(/\\/g, '/').replace('Z:/Objekt/Bild', 'http://localhost:3000');

            const retrievalLocation = _.find(({ ortstyp }) => ortstyp === 'Fundort/Herkunft', object.orte);

            return {
                id: object.imdasid,
                previewUrl,
                start,
                end,
                materials: _.map(({ term }) => term, object.materialien),
                inventoryId: object.inventarnummer,
                name: object.objektbezeichnung.term,
                technology: _.map(({ term }) => term, object.techniken),
                location: retrievalLocation ? retrievalLocation.term : null,
                era: object.datierung[0].datum,
                date: `(${formatDecimal(Math.abs(start))} - ${formatDecimal(Math.abs(end))} ${end < 0 ? 'v Chr.' : 'n Chr.'})`
            };
        }),
        _.filter(({ start, end, location }) => start !== undefined && end !== undefined && location !== null),
        _.sortBy(({ start }) => start)
    )(dataset)
);

const Content = styled.div`
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
`;


const Selection = styled.div`
    height: 100%;
    width: 100%;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: scroll;   
`;

const Gallery = styled.div`
    border-top: 1px solid #000;
    height: 300px;
    padding: 20px;
    display: flex;
    align-items: center;
    width: 100%;
    overflow: scroll;
`;

const InfoBox = styled.div`
    width: 400px;
    border-right: 1px solid #000;
    padding: 20px;
`;

const Comparison = styled.div`
    height: 100%;
    width: 100%;
    display: flex;
`;

const InfoProperty = styled.div`
    font-size: 20px;
    margin-bottom: 20px;
    line-height: 1.3em;
`;

const InfoLabel = styled.div`
    font-size: 16px;
    line-height: 1.3em;
`;

const InfoHeadline = styled.div`
    font-size: 25px;
    margin-bottom: 20px;
    line-height: 1.3em;
`;


const Button = styled.button`
    border: 1px solid grey;
    border-radius: 5px;    
    outline: 0;
    background: #fff;
    font-size: 16px;
    padding: 5px;    
`;


const Center = styled.div`
    margin-top: 40px;
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
`;

class App extends React.Component {

    constructor() {
        super();

        this.state = {
            focusedObjectId: exhibitionObjects[0].id,
            selectedObjects: [exhibitionObjects[0]]
        };

        _.bindAll(['handleDrop', 'handleFocusObject', 'removeFocusedObject'], this);
    }

    handleDrop(object) {
        this.setState(({ selectedObjects }) => ({
            selectedObjects: selectedObjects.concat(object),
            focusedObjectId: object.id
        }));
    };

    handleFocusObject(objectId) {
        console.log('handleFocusObject', objectId);
        this.setState({ focusedObjectId: objectId });
    }

    removeFocusedObject() {
        this.setState(({ selectedObjects, focusedObjectId }) => {
            const newSelectedObjects = _.filter(({ id }) => id !== focusedObjectId, selectedObjects);

            return {
                selectedObjects: newSelectedObjects,
                focusedObjectId: newSelectedObjects[0] ?  newSelectedObjects[0].id : null
            };
        });
    }

    render() {
        const { selectedObjects, focusedObjectId } = this.state;
        const focusedObject = exhibitionObjects.find(({ id }) => id === focusedObjectId);

        return (
            <DndProvider backend={Backend}>
                <Content>
                    <Comparison>
                        <InfoBox>
                            {focusedObject && (
                                <>

                                    <InfoLabel>{focusedObject.inventoryId}</InfoLabel>
                                    <InfoHeadline>{focusedObject.name}</InfoHeadline>


                                    <InfoLabel>Material</InfoLabel>
                                    <InfoProperty>{focusedObject.materials.join(', ')}</InfoProperty>

                                    <InfoLabel>Technik</InfoLabel>
                                    <InfoProperty>{focusedObject.technology.join(', ')}</InfoProperty>

                                    <InfoLabel>Datierung</InfoLabel>
                                    <InfoProperty>
                                        {focusedObject.era}<br/>
                                        {focusedObject.date}
                                    </InfoProperty>

                                    <InfoLabel>Fundort</InfoLabel>
                                    <InfoProperty>{focusedObject.location}</InfoProperty>

                                    <Center>
                                        <Button onClick={() => this.removeFocusedObject()}>
                                            Objekt zurücklegen
                                        </Button>
                                    </Center>

                                </>
                            )}
                        </InfoBox>

                        <SelectionView
                            focusedObjectId={focusedObjectId}
                            selectedObjects={selectedObjects}
                            onDrop={this.handleDrop}
                            onFocusObject={this.handleFocusObject}
                        />
                    </Comparison>
                    <Gallery>
                        {_.flow(
                            _.map((object) => (
                                <ImageView
                                    key={object.id}
                                    object={object}
                                />
                            )),
                            _.filter((object) => !selectedObjects.find(({ id }) => object.id === id))
                        )(exhibitionObjects)}
                    </Gallery>
                </Content>
            </DndProvider>
        );
    }
}

const SelectionPreviewImage = styled.img`
    max-height: 500px;
    opacity: ${({isFocused}) => isFocused ? '1' : '0.5'}
`;

function SelectionPreview({ object, onClick, isFocused }) {
    return (
        <SelectionPreviewImage
            src={object.previewUrl}
            onClick={onClick}
            isFocused={isFocused}
        />
    );
}

function SelectionView({ onDrop, onFocusObject, selectedObjects, focusedObjectId }) {
    const [{ isOver, isOverCurrent }, drop] = useDrop({
        accept: ItemTypes.OBJECT,
        drop(item, monitor) {
            const didDrop = monitor.didDrop();
            if (didDrop) {
                return;
            }

            onDrop(item.object);
        },
        collect: monitor => ({
            isOver: monitor.isOver(),
            isOverCurrent: monitor.isOver({ shallow: true })
        })
    });

    return (
        <Selection ref={drop} isOver={{ isOver }}>
            {_.map((object) => (
                <SelectionPreview
                    object={object}
                    key={object.id}
                    onClick={() => onFocusObject(object.id)}
                    isFocused={focusedObjectId === object.id}
                />
            ), selectedObjects)}
        </Selection>
    );
}

const Image = styled.img`
    height: 200px;
    opacity: ${({ isDragging }) => isDragging ? 0.5 : 1};
`;


function ImageView({ object }) {
    const [{ isDragging }, dragRef] = useDrag({
        item: { type: ItemTypes.OBJECT, object },
        collect: monitor => ({
            isDragging: monitor.isDragging()
        })
    });

    return (
        <div ref={dragRef}>
            <Image isDragging={isDragging}
                   src={object.previewUrl}/>
        </div>
    );
}


render(<App/>, document.getElementById('app'));
